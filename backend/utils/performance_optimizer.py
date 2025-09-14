"""
Performance optimization utilities for the Recall application.

This module provides centralized performance optimization functions including:
- Memory management and cleanup
- File I/O optimizations
- Caching mechanisms
- Resource pooling
"""

import os
import gc
import sys
import time
import threading
import weakref
from typing import Dict, Any, Optional, List, Callable
from functools import lru_cache, wraps
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

class MemoryManager:
    """Centralized memory management for the application."""
    
    def __init__(self):
        self._memory_threshold = 1024 * 1024 * 1024  # 1GB threshold
        self._cleanup_callbacks: List[Callable] = []
        self._lock = threading.Lock()
    
    def register_cleanup_callback(self, callback: Callable):
        """Register a callback to be called during memory cleanup."""
        with self._lock:
            self._cleanup_callbacks.append(callback)
    
    def cleanup_memory(self, force: bool = False):
        """Perform memory cleanup operations."""
        try:
            # Call registered cleanup callbacks
            with self._lock:
                for callback in self._cleanup_callbacks:
                    try:
                        callback()
                    except Exception as e:
                        logger.warning(f"Cleanup callback failed: {e}")
            
            # Force garbage collection
            collected = gc.collect()
            logger.info(f"Memory cleanup: collected {collected} objects")
            
            return True
        except Exception as e:
            logger.error(f"Memory cleanup failed: {e}")
            return False
    
    def get_memory_usage(self) -> Dict[str, Any]:
        """Get current memory usage statistics."""
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            
            return {
                'rss': memory_info.rss,
                'vms': memory_info.vms,
                'percent': process.memory_percent(),
                'available': psutil.virtual_memory().available
            }
        except ImportError:
            # Fallback if psutil not available
            return {'error': 'psutil not available'}

class FileCache:
    """High-performance file caching system."""
    
    def __init__(self, cache_dir: str, max_size_mb: int = 500):
        self.cache_dir = cache_dir
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self._cache_index: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()
        
        # Ensure cache directory exists
        os.makedirs(cache_dir, exist_ok=True)
        
        # Load existing cache index
        self._load_cache_index()
    
    def _load_cache_index(self):
        """Load cache index from disk."""
        index_file = os.path.join(self.cache_dir, 'cache_index.json')
        try:
            if os.path.exists(index_file):
                with open(index_file, 'r') as f:
                    self._cache_index = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load cache index: {e}")
            self._cache_index = {}
    
    def _save_cache_index(self):
        """Save cache index to disk."""
        index_file = os.path.join(self.cache_dir, 'cache_index.json')
        try:
            with open(index_file, 'w') as f:
                json.dump(self._cache_index, f)
        except Exception as e:
            logger.warning(f"Failed to save cache index: {e}")
    
    def _get_file_hash(self, file_path: str) -> str:
        """Generate hash for file content."""
        hasher = hashlib.md5()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            logger.error(f"Failed to hash file {file_path}: {e}")
            return ""
    
    def get_cached_result(self, key: str, file_path: str = None) -> Optional[Any]:
        """Get cached result if available and valid."""
        with self._lock:
            if key not in self._cache_index:
                return None
            
            cache_entry = self._cache_index[key]
            cache_file = os.path.join(self.cache_dir, f"{key}.json")
            
            # Check if cache file exists
            if not os.path.exists(cache_file):
                del self._cache_index[key]
                return None
            
            # Check file hash if file_path provided
            if file_path and os.path.exists(file_path):
                current_hash = self._get_file_hash(file_path)
                if current_hash != cache_entry.get('file_hash', ''):
                    # File changed, invalidate cache
                    self._remove_cache_entry(key)
                    return None
            
            # Load and return cached result
            try:
                with open(cache_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache entry {key}: {e}")
                self._remove_cache_entry(key)
                return None
    
    def cache_result(self, key: str, result: Any, file_path: str = None):
        """Cache a result."""
        with self._lock:
            try:
                cache_file = os.path.join(self.cache_dir, f"{key}.json")
                
                # Save result to cache file
                with open(cache_file, 'w') as f:
                    json.dump(result, f)
                
                # Update cache index
                cache_entry = {
                    'timestamp': time.time(),
                    'size': os.path.getsize(cache_file)
                }
                
                if file_path and os.path.exists(file_path):
                    cache_entry['file_hash'] = self._get_file_hash(file_path)
                
                self._cache_index[key] = cache_entry
                self._save_cache_index()
                
                # Check cache size and cleanup if needed
                self._cleanup_if_needed()
                
            except Exception as e:
                logger.error(f"Failed to cache result for {key}: {e}")
    
    def _remove_cache_entry(self, key: str):
        """Remove a cache entry."""
        try:
            cache_file = os.path.join(self.cache_dir, f"{key}.json")
            if os.path.exists(cache_file):
                os.remove(cache_file)
            
            if key in self._cache_index:
                del self._cache_index[key]
        except Exception as e:
            logger.warning(f"Failed to remove cache entry {key}: {e}")
    
    def _cleanup_if_needed(self):
        """Cleanup old cache entries if cache size exceeds limit."""
        try:
            total_size = sum(entry.get('size', 0) for entry in self._cache_index.values())
            
            if total_size > self.max_size_bytes:
                # Sort by timestamp (oldest first)
                sorted_entries = sorted(
                    self._cache_index.items(),
                    key=lambda x: x[1].get('timestamp', 0)
                )
                
                # Remove oldest entries until under limit
                for key, entry in sorted_entries:
                    if total_size <= self.max_size_bytes * 0.8:  # 80% of limit
                        break
                    
                    self._remove_cache_entry(key)
                    total_size -= entry.get('size', 0)
                
                self._save_cache_index()
                logger.info(f"Cache cleanup completed, new size: {total_size} bytes")
        
        except Exception as e:
            logger.error(f"Cache cleanup failed: {e}")

class ProcessingPool:
    """Thread pool for parallel processing operations."""
    
    def __init__(self, max_workers: int = None):
        self.max_workers = max_workers or min(32, (os.cpu_count() or 1) + 4)
        self._executor = ThreadPoolExecutor(max_workers=self.max_workers)
        self._active_tasks: Dict[str, Any] = {}
        self._lock = threading.Lock()
    
    def submit_task(self, task_id: str, func: Callable, *args, **kwargs):
        """Submit a task for parallel execution."""
        with self._lock:
            if task_id in self._active_tasks:
                logger.warning(f"Task {task_id} already active")
                return None
            
            future = self._executor.submit(func, *args, **kwargs)
            self._active_tasks[task_id] = {
                'future': future,
                'start_time': time.time()
            }
            
            return future
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a submitted task."""
        with self._lock:
            if task_id not in self._active_tasks:
                return None
            
            task_info = self._active_tasks[task_id]
            future = task_info['future']
            
            status = {
                'task_id': task_id,
                'start_time': task_info['start_time'],
                'elapsed': time.time() - task_info['start_time'],
                'done': future.done()
            }
            
            if future.done():
                try:
                    status['result'] = future.result()
                    status['success'] = True
                except Exception as e:
                    status['error'] = str(e)
                    status['success'] = False
                
                # Clean up completed task
                del self._active_tasks[task_id]
            
            return status
    
    def cancel_task(self, task_id: str) -> bool:
        """Cancel a submitted task."""
        with self._lock:
            if task_id not in self._active_tasks:
                return False
            
            future = self._active_tasks[task_id]['future']
            cancelled = future.cancel()
            
            if cancelled or future.done():
                del self._active_tasks[task_id]
            
            return cancelled
    
    def shutdown(self, wait: bool = True):
        """Shutdown the processing pool."""
        self._executor.shutdown(wait=wait)

# Global instances
_memory_manager = MemoryManager()
_processing_pool = ProcessingPool()
_file_cache = None  # Initialized when needed

def get_memory_manager() -> MemoryManager:
    """Get the global memory manager instance."""
    return _memory_manager

def get_processing_pool() -> ProcessingPool:
    """Get the global processing pool instance."""
    return _processing_pool

def get_file_cache(cache_dir: str = None) -> FileCache:
    """Get the global file cache instance."""
    global _file_cache
    if _file_cache is None:
        if cache_dir is None:
            # Use default cache directory
            from utils.path_resolver import get_logs_dir
            cache_dir = os.path.join(get_logs_dir(), 'cache')
        _file_cache = FileCache(cache_dir)
    return _file_cache

def performance_monitor(func):
    """Decorator to monitor function performance."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.debug(f"Function {func.__name__} executed in {execution_time:.4f}s")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Function {func.__name__} failed after {execution_time:.4f}s: {e}")
            raise
    return wrapper

def cached_function(cache_key_func: Callable = None, ttl: int = 3600):
    """Decorator to cache function results."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}_{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache
            cache = get_file_cache()
            cached_result = cache.get_cached_result(cache_key)
            
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.cache_result(cache_key, result)
            logger.debug(f"Cached result for {func.__name__}")
            
            return result
        return wrapper
    return decorator

def optimize_for_memory():
    """Perform system-wide memory optimizations."""
    try:
        # Clear caches
        if _file_cache:
            _file_cache._cleanup_if_needed()
        
        # Clear PathResolver cache
        from utils.path_resolver import PathResolver
        PathResolver.clear_cache()
        
        # Run memory cleanup
        _memory_manager.cleanup_memory()
        
        logger.info("Memory optimization completed")
        return True
    
    except Exception as e:
        logger.error(f"Memory optimization failed: {e}")
        return False

def get_performance_stats() -> Dict[str, Any]:
    """Get comprehensive performance statistics."""
    stats = {
        'timestamp': time.time(),
        'memory': _memory_manager.get_memory_usage(),
        'active_tasks': len(_processing_pool._active_tasks),
        'max_workers': _processing_pool.max_workers
    }
    
    if _file_cache:
        stats['cache_entries'] = len(_file_cache._cache_index)
        stats['cache_size'] = sum(
            entry.get('size', 0) for entry in _file_cache._cache_index.values()
        )
    
    return stats