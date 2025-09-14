"""
Connection pooling and network optimization utilities.

This module provides:
- HTTP connection pooling
- Request batching
- Network performance monitoring
- Adaptive timeout management
"""

import asyncio
import aiohttp
import time
import logging
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from collections import defaultdict, deque
import json
import threading
from concurrent.futures import ThreadPoolExecutor
import weakref

logger = logging.getLogger(__name__)

@dataclass
class RequestMetrics:
    """Metrics for tracking request performance."""
    url: str
    method: str
    start_time: float
    end_time: float = 0.0
    response_size: int = 0
    status_code: int = 0
    error: Optional[str] = None
    
    @property
    def duration(self) -> float:
        return self.end_time - self.start_time if self.end_time > 0 else 0.0
    
    @property
    def success(self) -> bool:
        return 200 <= self.status_code < 300 and self.error is None

@dataclass
class ConnectionPoolConfig:
    """Configuration for connection pool."""
    max_connections: int = 100
    max_connections_per_host: int = 30
    connection_timeout: float = 30.0
    read_timeout: float = 60.0
    keepalive_timeout: float = 30.0
    enable_compression: bool = True
    max_retries: int = 3
    retry_delay: float = 1.0
    
class AdaptiveTimeout:
    """Adaptive timeout management based on historical performance."""
    
    def __init__(self, initial_timeout: float = 30.0, min_timeout: float = 5.0, max_timeout: float = 300.0):
        self.initial_timeout = initial_timeout
        self.min_timeout = min_timeout
        self.max_timeout = max_timeout
        self._response_times: Dict[str, deque] = defaultdict(lambda: deque(maxlen=50))
        self._lock = threading.Lock()
    
    def record_response_time(self, endpoint: str, response_time: float):
        """Record response time for an endpoint."""
        with self._lock:
            self._response_times[endpoint].append(response_time)
    
    def get_timeout(self, endpoint: str) -> float:
        """Get adaptive timeout for an endpoint."""
        with self._lock:
            times = self._response_times.get(endpoint)
            if not times or len(times) < 5:
                return self.initial_timeout
            
            # Calculate timeout based on 95th percentile + buffer
            sorted_times = sorted(times)
            p95_index = int(len(sorted_times) * 0.95)
            p95_time = sorted_times[p95_index]
            
            # Add 50% buffer and clamp to limits
            adaptive_timeout = p95_time * 1.5
            return max(self.min_timeout, min(adaptive_timeout, self.max_timeout))

class RequestBatcher:
    """Batches multiple requests for efficient processing."""
    
    def __init__(self, batch_size: int = 10, batch_timeout: float = 1.0):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self._pending_requests: List[Dict[str, Any]] = []
        self._batch_timer: Optional[asyncio.Handle] = None
        self._lock = asyncio.Lock()
        self._batch_processors: Dict[str, Callable] = {}
    
    def register_batch_processor(self, request_type: str, processor: Callable):
        """Register a batch processor for a specific request type."""
        self._batch_processors[request_type] = processor
    
    async def add_request(self, request_type: str, request_data: Dict[str, Any]) -> Any:
        """Add a request to the batch."""
        future = asyncio.Future()
        
        async with self._lock:
            self._pending_requests.append({
                'type': request_type,
                'data': request_data,
                'future': future,
                'timestamp': time.time()
            })
            
            # Start batch timer if not already running
            if self._batch_timer is None:
                self._batch_timer = asyncio.get_event_loop().call_later(
                    self.batch_timeout, 
                    lambda: asyncio.create_task(self._process_batch())
                )
            
            # Process immediately if batch is full
            if len(self._pending_requests) >= self.batch_size:
                if self._batch_timer:
                    self._batch_timer.cancel()
                    self._batch_timer = None
                await self._process_batch()
        
        return await future
    
    async def _process_batch(self):
        """Process the current batch of requests."""
        async with self._lock:
            if not self._pending_requests:
                return
            
            batch = self._pending_requests.copy()
            self._pending_requests.clear()
            self._batch_timer = None
        
        # Group requests by type
        grouped_requests = defaultdict(list)
        for request in batch:
            grouped_requests[request['type']].append(request)
        
        # Process each group
        for request_type, requests in grouped_requests.items():
            processor = self._batch_processors.get(request_type)
            if processor:
                try:
                    results = await processor([req['data'] for req in requests])
                    
                    # Set results for futures
                    for request, result in zip(requests, results):
                        if not request['future'].done():
                            request['future'].set_result(result)
                
                except Exception as e:
                    # Set exception for all futures in this batch
                    for request in requests:
                        if not request['future'].done():
                            request['future'].set_exception(e)
            else:
                # No processor registered, set error
                error = f"No batch processor registered for type: {request_type}"
                for request in requests:
                    if not request['future'].done():
                        request['future'].set_exception(ValueError(error))

class OptimizedConnectionPool:
    """Optimized HTTP connection pool with advanced features."""
    
    def __init__(self, config: ConnectionPoolConfig = None):
        self.config = config or ConnectionPoolConfig()
        self._session: Optional[aiohttp.ClientSession] = None
        self._metrics: List[RequestMetrics] = []
        self._adaptive_timeout = AdaptiveTimeout()
        self._request_batcher = RequestBatcher()
        self._lock = asyncio.Lock()
        
        # Performance tracking
        self._total_requests = 0
        self._successful_requests = 0
        self._failed_requests = 0
        self._total_bytes_transferred = 0
        
        # Setup batch processors
        self._setup_batch_processors()
    
    def _setup_batch_processors(self):
        """Setup default batch processors."""
        self._request_batcher.register_batch_processor('GET', self._batch_get_processor)
        self._request_batcher.register_batch_processor('POST', self._batch_post_processor)
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create the HTTP session."""
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(
                limit=self.config.max_connections,
                limit_per_host=self.config.max_connections_per_host,
                keepalive_timeout=self.config.keepalive_timeout,
                enable_cleanup_closed=True
            )
            
            timeout = aiohttp.ClientTimeout(
                total=self.config.connection_timeout,
                connect=self.config.connection_timeout / 2
            )
            
            self._session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={'User-Agent': 'Recall-OptimizedClient/1.0'}
            )
        
        return self._session
    
    async def request(self, method: str, url: str, 
                     batch: bool = False, 
                     adaptive_timeout: bool = True,
                     **kwargs) -> aiohttp.ClientResponse:
        """
        Make an HTTP request with optimizations.
        
        Args:
            method: HTTP method
            url: Request URL
            batch: Whether to batch this request
            adaptive_timeout: Whether to use adaptive timeout
            **kwargs: Additional request parameters
        
        Returns:
            HTTP response
        """
        if batch:
            return await self._request_batcher.add_request(method, {
                'url': url,
                'kwargs': kwargs
            })
        
        return await self._make_request(method, url, adaptive_timeout, **kwargs)
    
    async def _make_request(self, method: str, url: str, 
                          adaptive_timeout: bool = True,
                          **kwargs) -> aiohttp.ClientResponse:
        """Make a single HTTP request."""
        session = await self._get_session()
        
        # Setup adaptive timeout
        if adaptive_timeout:
            endpoint = f"{method}:{url.split('?')[0]}"  # Remove query params for endpoint key
            timeout = self._adaptive_timeout.get_timeout(endpoint)
            kwargs['timeout'] = aiohttp.ClientTimeout(total=timeout)
        
        # Create metrics
        metrics = RequestMetrics(
            url=url,
            method=method,
            start_time=time.time()
        )
        
        try:
            # Make request with retries
            response = await self._make_request_with_retries(session, method, url, **kwargs)
            
            # Update metrics
            metrics.end_time = time.time()
            metrics.status_code = response.status
            metrics.response_size = int(response.headers.get('content-length', 0))
            
            # Record performance data
            if adaptive_timeout:
                self._adaptive_timeout.record_response_time(endpoint, metrics.duration)
            
            # Update statistics
            self._total_requests += 1
            if metrics.success:
                self._successful_requests += 1
            else:
                self._failed_requests += 1
            
            self._total_bytes_transferred += metrics.response_size
            
            # Store metrics
            async with self._lock:
                self._metrics.append(metrics)
                # Keep only recent metrics
                if len(self._metrics) > 1000:
                    self._metrics = self._metrics[-500:]
            
            return response
        
        except Exception as e:
            metrics.end_time = time.time()
            metrics.error = str(e)
            
            async with self._lock:
                self._metrics.append(metrics)
            
            self._total_requests += 1
            self._failed_requests += 1
            
            raise
    
    async def _make_request_with_retries(self, session: aiohttp.ClientSession,
                                       method: str, url: str, **kwargs) -> aiohttp.ClientResponse:
        """Make request with retry logic."""
        last_exception = None
        
        for attempt in range(self.config.max_retries + 1):
            try:
                response = await session.request(method, url, **kwargs)
                
                # Check if we should retry based on status code
                if response.status >= 500 and attempt < self.config.max_retries:
                    await response.close()
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                    continue
                
                return response
            
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                last_exception = e
                if attempt < self.config.max_retries:
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                    continue
                break
        
        raise last_exception or Exception("Max retries exceeded")
    
    async def _batch_get_processor(self, requests: List[Dict[str, Any]]) -> List[Any]:
        """Process a batch of GET requests."""
        tasks = []
        for request in requests:
            task = self._make_request('GET', request['url'], False, **request['kwargs'])
            tasks.append(task)
        
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _batch_post_processor(self, requests: List[Dict[str, Any]]) -> List[Any]:
        """Process a batch of POST requests."""
        tasks = []
        for request in requests:
            task = self._make_request('POST', request['url'], False, **request['kwargs'])
            tasks.append(task)
        
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def get(self, url: str, **kwargs) -> aiohttp.ClientResponse:
        """Make a GET request."""
        return await self.request('GET', url, **kwargs)
    
    async def post(self, url: str, **kwargs) -> aiohttp.ClientResponse:
        """Make a POST request."""
        return await self.request('POST', url, **kwargs)
    
    async def put(self, url: str, **kwargs) -> aiohttp.ClientResponse:
        """Make a PUT request."""
        return await self.request('PUT', url, **kwargs)
    
    async def delete(self, url: str, **kwargs) -> aiohttp.ClientResponse:
        """Make a DELETE request."""
        return await self.request('DELETE', url, **kwargs)
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        success_rate = (self._successful_requests / self._total_requests * 100) if self._total_requests > 0 else 0
        
        # Calculate average response time
        recent_metrics = [m for m in self._metrics if m.success and m.duration > 0]
        avg_response_time = sum(m.duration for m in recent_metrics) / len(recent_metrics) if recent_metrics else 0
        
        return {
            'total_requests': self._total_requests,
            'successful_requests': self._successful_requests,
            'failed_requests': self._failed_requests,
            'success_rate_percent': success_rate,
            'average_response_time_ms': avg_response_time * 1000,
            'total_bytes_transferred': self._total_bytes_transferred,
            'active_connections': len(self._session.connector._conns) if self._session else 0
        }
    
    async def close(self):
        """Close the connection pool."""
        if self._session and not self._session.closed:
            await self._session.close()

class NetworkOptimizer:
    """Network optimization utilities."""
    
    def __init__(self):
        self._connection_pools: Dict[str, OptimizedConnectionPool] = {}
        self._global_stats = {
            'requests_per_second': deque(maxlen=60),  # Last 60 seconds
            'bandwidth_usage': deque(maxlen=60),
            'error_rate': deque(maxlen=60)
        }
        self._stats_lock = threading.Lock()
    
    def get_connection_pool(self, pool_name: str = 'default', 
                          config: ConnectionPoolConfig = None) -> OptimizedConnectionPool:
        """Get or create a connection pool."""
        if pool_name not in self._connection_pools:
            self._connection_pools[pool_name] = OptimizedConnectionPool(config)
        return self._connection_pools[pool_name]
    
    def record_network_stats(self, requests_count: int, bytes_transferred: int, errors: int):
        """Record network statistics."""
        with self._stats_lock:
            current_time = time.time()
            
            self._global_stats['requests_per_second'].append((current_time, requests_count))
            self._global_stats['bandwidth_usage'].append((current_time, bytes_transferred))
            self._global_stats['error_rate'].append((current_time, errors))
    
    def get_network_health(self) -> Dict[str, Any]:
        """Get overall network health metrics."""
        with self._stats_lock:
            current_time = time.time()
            
            # Calculate metrics for the last minute
            recent_requests = [count for timestamp, count in self._global_stats['requests_per_second'] 
                             if current_time - timestamp <= 60]
            recent_bandwidth = [bytes_val for timestamp, bytes_val in self._global_stats['bandwidth_usage'] 
                              if current_time - timestamp <= 60]
            recent_errors = [errors for timestamp, errors in self._global_stats['error_rate'] 
                           if current_time - timestamp <= 60]
            
            total_requests = sum(recent_requests)
            total_bandwidth = sum(recent_bandwidth)
            total_errors = sum(recent_errors)
            
            error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'requests_per_minute': total_requests,
                'bandwidth_mbps': (total_bandwidth * 8) / (1024 * 1024 * 60),  # Convert to Mbps
                'error_rate_percent': error_rate,
                'active_pools': len(self._connection_pools),
                'health_status': 'good' if error_rate < 5 else 'degraded' if error_rate < 15 else 'poor'
            }
    
    async def optimize_all_pools(self):
        """Optimize all connection pools."""
        for pool in self._connection_pools.values():
            # Could implement pool-specific optimizations here
            pass
    
    async def close_all_pools(self):
        """Close all connection pools."""
        for pool in self._connection_pools.values():
            await pool.close()
        self._connection_pools.clear()

# Global instances
_network_optimizer = None

def get_network_optimizer() -> NetworkOptimizer:
    """Get the global network optimizer instance."""
    global _network_optimizer
    if _network_optimizer is None:
        _network_optimizer = NetworkOptimizer()
    return _network_optimizer

def get_optimized_session(pool_name: str = 'default', 
                         config: ConnectionPoolConfig = None) -> OptimizedConnectionPool:
    """Get an optimized HTTP session."""
    optimizer = get_network_optimizer()
    return optimizer.get_connection_pool(pool_name, config)