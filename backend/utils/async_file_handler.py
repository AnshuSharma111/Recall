"""
Asynchronous file handling utilities for improved I/O performance.

This module provides:
- Streaming file uploads
- Asynchronous file operations
- File deduplication
- Optimized temporary file management
"""

import os
import asyncio
import aiofiles
import hashlib
import shutil
import tempfile
from typing import Dict, List, Optional, AsyncGenerator, Tuple, Any
from pathlib import Path
import logging
from concurrent.futures import ThreadPoolExecutor
import time

logger = logging.getLogger(__name__)

class AsyncFileHandler:
    """Asynchronous file handler with optimization features."""
    
    def __init__(self, temp_dir: str = None, chunk_size: int = 8192):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.chunk_size = chunk_size
        self._file_hashes: Dict[str, str] = {}
        self._executor = ThreadPoolExecutor(max_workers=4)
        
        # Ensure temp directory exists
        os.makedirs(self.temp_dir, exist_ok=True)
    
    async def calculate_file_hash(self, file_path: str) -> str:
        """Calculate MD5 hash of a file asynchronously."""
        def _hash_file():
            hasher = hashlib.md5()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(self.chunk_size), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, _hash_file)
    
    async def stream_upload(self, file_data: AsyncGenerator[bytes, None], 
                          destination: str, 
                          expected_size: Optional[int] = None) -> Dict[str, Any]:
        """
        Stream file upload with progress tracking.
        
        Args:
            file_data: Async generator yielding file chunks
            destination: Destination file path
            expected_size: Expected file size for progress calculation
        
        Returns:
            Dictionary with upload statistics
        """
        start_time = time.time()
        bytes_written = 0
        
        try:
            # Ensure destination directory exists
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            
            async with aiofiles.open(destination, 'wb') as f:
                async for chunk in file_data:
                    await f.write(chunk)
                    bytes_written += len(chunk)
                    
                    # Log progress for large files
                    if expected_size and bytes_written % (1024 * 1024) == 0:  # Every MB
                        progress = (bytes_written / expected_size) * 100
                        logger.debug(f"Upload progress: {progress:.1f}% ({bytes_written}/{expected_size} bytes)")
            
            # Calculate final statistics
            end_time = time.time()
            duration = end_time - start_time
            speed_mbps = (bytes_written / (1024 * 1024)) / duration if duration > 0 else 0
            
            # Calculate file hash for deduplication
            file_hash = await self.calculate_file_hash(destination)
            
            return {
                'success': True,
                'bytes_written': bytes_written,
                'duration': duration,
                'speed_mbps': speed_mbps,
                'file_hash': file_hash,
                'destination': destination
            }
        
        except Exception as e:
            logger.error(f"Stream upload failed: {e}")
            # Clean up partial file
            if os.path.exists(destination):
                try:
                    os.remove(destination)
                except:
                    pass
            
            return {
                'success': False,
                'error': str(e),
                'bytes_written': bytes_written
            }
    
    async def deduplicate_file(self, file_path: str, 
                             dedup_dir: str) -> Tuple[bool, str]:
        """
        Check if file is duplicate and return deduplicated path.
        
        Args:
            file_path: Path to the file to check
            dedup_dir: Directory for storing deduplicated files
        
        Returns:
            Tuple of (is_duplicate, final_path)
        """
        try:
            # Calculate file hash
            file_hash = await self.calculate_file_hash(file_path)
            
            # Check if we've seen this hash before
            dedup_path = os.path.join(dedup_dir, f"{file_hash}{Path(file_path).suffix}")
            
            if os.path.exists(dedup_path):
                # File is duplicate, remove original and return deduplicated path
                os.remove(file_path)
                logger.info(f"Deduplicated file: {file_path} -> {dedup_path}")
                return True, dedup_path
            else:
                # Move file to dedup directory
                os.makedirs(dedup_dir, exist_ok=True)
                shutil.move(file_path, dedup_path)
                logger.debug(f"Moved file to dedup directory: {file_path} -> {dedup_path}")
                return False, dedup_path
        
        except Exception as e:
            logger.error(f"Deduplication failed for {file_path}: {e}")
            return False, file_path
    
    async def copy_file_async(self, src: str, dst: str, 
                            preserve_metadata: bool = True) -> bool:
        """
        Copy file asynchronously with optional metadata preservation.
        
        Args:
            src: Source file path
            dst: Destination file path
            preserve_metadata: Whether to preserve file metadata
        
        Returns:
            True if successful, False otherwise
        """
        def _copy_file():
            try:
                # Ensure destination directory exists
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                
                if preserve_metadata:
                    shutil.copy2(src, dst)
                else:
                    shutil.copy(src, dst)
                
                return True
            except Exception as e:
                logger.error(f"File copy failed: {e}")
                return False
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, _copy_file)
    
    async def batch_process_files(self, file_operations: List[Dict[str, Any]], 
                                max_concurrent: int = 5) -> List[Dict[str, Any]]:
        """
        Process multiple file operations concurrently.
        
        Args:
            file_operations: List of operation dictionaries
            max_concurrent: Maximum concurrent operations
        
        Returns:
            List of operation results
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def _process_operation(operation: Dict[str, Any]) -> Dict[str, Any]:
            async with semaphore:
                op_type = operation.get('type')
                
                try:
                    if op_type == 'copy':
                        success = await self.copy_file_async(
                            operation['src'], 
                            operation['dst'],
                            operation.get('preserve_metadata', True)
                        )
                        return {
                            'operation': operation,
                            'success': success,
                            'result': 'copied' if success else 'failed'
                        }
                    
                    elif op_type == 'hash':
                        file_hash = await self.calculate_file_hash(operation['file_path'])
                        return {
                            'operation': operation,
                            'success': True,
                            'result': file_hash
                        }
                    
                    elif op_type == 'deduplicate':
                        is_dup, final_path = await self.deduplicate_file(
                            operation['file_path'],
                            operation['dedup_dir']
                        )
                        return {
                            'operation': operation,
                            'success': True,
                            'result': {
                                'is_duplicate': is_dup,
                                'final_path': final_path
                            }
                        }
                    
                    else:
                        return {
                            'operation': operation,
                            'success': False,
                            'error': f'Unknown operation type: {op_type}'
                        }
                
                except Exception as e:
                    return {
                        'operation': operation,
                        'success': False,
                        'error': str(e)
                    }
        
        # Execute all operations concurrently
        tasks = [_process_operation(op) for op in file_operations]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                processed_results.append({
                    'success': False,
                    'error': str(result)
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def cleanup_temp_files(self, max_age_hours: int = 24) -> Dict[str, Any]:
        """
        Clean up temporary files older than specified age.
        
        Args:
            max_age_hours: Maximum age of files to keep (in hours)
        
        Returns:
            Cleanup statistics
        """
        def _cleanup():
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            cleaned_files = 0
            cleaned_size = 0
            errors = 0
            
            try:
                for root, dirs, files in os.walk(self.temp_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        
                        try:
                            # Check file age
                            file_age = current_time - os.path.getmtime(file_path)
                            
                            if file_age > max_age_seconds:
                                file_size = os.path.getsize(file_path)
                                os.remove(file_path)
                                cleaned_files += 1
                                cleaned_size += file_size
                        
                        except Exception as e:
                            logger.warning(f"Failed to clean up {file_path}: {e}")
                            errors += 1
                
                return {
                    'cleaned_files': cleaned_files,
                    'cleaned_size_mb': cleaned_size / (1024 * 1024),
                    'errors': errors
                }
            
            except Exception as e:
                logger.error(f"Cleanup failed: {e}")
                return {
                    'cleaned_files': 0,
                    'cleaned_size_mb': 0,
                    'errors': 1,
                    'error': str(e)
                }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, _cleanup)
    
    def shutdown(self):
        """Shutdown the async file handler."""
        self._executor.shutdown(wait=True)

class StreamingUploadHandler:
    """Handler for streaming file uploads with progress tracking."""
    
    def __init__(self, chunk_size: int = 8192):
        self.chunk_size = chunk_size
        self.active_uploads: Dict[str, Dict[str, Any]] = {}
    
    async def handle_upload_stream(self, upload_id: str, 
                                 file_stream, 
                                 destination: str,
                                 progress_callback=None) -> Dict[str, Any]:
        """
        Handle a streaming file upload with progress tracking.
        
        Args:
            upload_id: Unique identifier for this upload
            file_stream: File stream object
            destination: Destination file path
            progress_callback: Optional callback for progress updates
        
        Returns:
            Upload result dictionary
        """
        self.active_uploads[upload_id] = {
            'start_time': time.time(),
            'bytes_received': 0,
            'status': 'uploading'
        }
        
        try:
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            
            async with aiofiles.open(destination, 'wb') as f:
                while True:
                    chunk = await file_stream.read(self.chunk_size)
                    if not chunk:
                        break
                    
                    await f.write(chunk)
                    self.active_uploads[upload_id]['bytes_received'] += len(chunk)
                    
                    # Call progress callback if provided
                    if progress_callback:
                        await progress_callback(upload_id, self.active_uploads[upload_id])
            
            # Mark as completed
            self.active_uploads[upload_id]['status'] = 'completed'
            self.active_uploads[upload_id]['end_time'] = time.time()
            
            return {
                'success': True,
                'upload_id': upload_id,
                'bytes_received': self.active_uploads[upload_id]['bytes_received'],
                'duration': self.active_uploads[upload_id]['end_time'] - self.active_uploads[upload_id]['start_time']
            }
        
        except Exception as e:
            self.active_uploads[upload_id]['status'] = 'failed'
            self.active_uploads[upload_id]['error'] = str(e)
            
            # Clean up partial file
            if os.path.exists(destination):
                try:
                    os.remove(destination)
                except:
                    pass
            
            return {
                'success': False,
                'upload_id': upload_id,
                'error': str(e)
            }
    
    def get_upload_status(self, upload_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an active upload."""
        return self.active_uploads.get(upload_id)
    
    def cancel_upload(self, upload_id: str) -> bool:
        """Cancel an active upload."""
        if upload_id in self.active_uploads:
            self.active_uploads[upload_id]['status'] = 'cancelled'
            return True
        return False

# Global instances
_async_file_handler = None
_streaming_upload_handler = None

def get_async_file_handler(temp_dir: str = None) -> AsyncFileHandler:
    """Get the global async file handler instance."""
    global _async_file_handler
    if _async_file_handler is None:
        _async_file_handler = AsyncFileHandler(temp_dir)
    return _async_file_handler

def get_streaming_upload_handler() -> StreamingUploadHandler:
    """Get the global streaming upload handler instance."""
    global _streaming_upload_handler
    if _streaming_upload_handler is None:
        _streaming_upload_handler = StreamingUploadHandler()
    return _streaming_upload_handler