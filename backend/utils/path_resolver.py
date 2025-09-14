"""
PathResolver utility for centralized path management in the Recall application.

This module provides a centralized way to resolve file paths that works consistently
in both development and build environments, addressing the critical path resolution
bugs in the application.
"""

import os
import logging
import time
import threading
from typing import Optional, Dict, Any
from dataclasses import dataclass


class PathResolutionError(Exception):
    """Custom exception for path resolution failures."""
    pass


@dataclass
class PathConfig:
    """Configuration object containing all resolved paths."""
    project_root: str
    decks_dir: str
    static_dir: str
    images_dir: str
    processing_dir: str
    logs_dir: str
    backend_dir: str
    
    def validate(self) -> bool:
        """Validate that all critical paths exist or can be created."""
        try:
            for path in [self.decks_dir, self.static_dir, self.images_dir, 
                        self.processing_dir, self.logs_dir]:
                if not os.path.exists(path):
                    os.makedirs(path, exist_ok=True)
            return True
        except Exception as e:
            logging.error(f"Path validation failed: {e}")
            return False


class PathResolver:
    """
    Centralized path resolution utility that works in both development and build environments.
    
    This class provides methods to determine the correct project root and resolve all
    application paths consistently, regardless of where the application is executed from.
    
    Features performance optimizations:
    - Caching of resolved paths to avoid repeated calculations
    - Thread-safe singleton implementation
    - Cache invalidation based on file system changes
    """
    
    _instance: Optional['PathResolver'] = None
    _config: Optional[PathConfig] = None
    _cache: Dict[str, Any] = {}
    _cache_timestamps: Dict[str, float] = {}
    _cache_ttl: float = 300.0  # 5 minutes cache TTL
    _lock = threading.RLock()  # Reentrant lock for thread safety
    
    def __new__(cls) -> 'PathResolver':
        """Thread-safe singleton pattern to ensure consistent path resolution."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
            return cls._instance
    
    def __init__(self):
        """Initialize the PathResolver if not already initialized."""
        with self._lock:
            if self._config is None:
                self._config = self._resolve_all_paths()
    
    @classmethod
    def _get_cached_value(cls, key: str, compute_func, *args, **kwargs) -> Any:
        """
        Get a cached value or compute it if not cached or expired.
        
        Args:
            key: Cache key
            compute_func: Function to compute the value if not cached
            *args, **kwargs: Arguments to pass to compute_func
            
        Returns:
            Cached or computed value
        """
        with cls._lock:
            current_time = time.time()
            
            # Check if we have a valid cached value
            if (key in cls._cache and 
                key in cls._cache_timestamps and 
                current_time - cls._cache_timestamps[key] < cls._cache_ttl):
                return cls._cache[key]
            
            # Compute new value
            value = compute_func(*args, **kwargs)
            
            # Cache the result
            cls._cache[key] = value
            cls._cache_timestamps[key] = current_time
            
            return value
    
    @classmethod
    def _invalidate_cache(cls, key: Optional[str] = None):
        """
        Invalidate cache entries.
        
        Args:
            key: Specific key to invalidate, or None to clear all cache
        """
        with cls._lock:
            if key is None:
                cls._cache.clear()
                cls._cache_timestamps.clear()
                logging.info("PathResolver cache cleared")
            elif key in cls._cache:
                del cls._cache[key]
                if key in cls._cache_timestamps:
                    del cls._cache_timestamps[key]
                logging.debug(f"PathResolver cache invalidated for key: {key}")
    
    @classmethod
    def _compute_project_root(cls) -> str:
        """
        Internal method to compute the project root directory.
        
        This method looks for project markers (CMakeLists.txt) to identify the
        true project root, working in both development and build environments.
        
        Returns:
            str: Absolute path to the project root directory
            
        Raises:
            PathResolutionError: If project root cannot be determined
        """
        try:
            # Start from the current file's directory (backend/utils/)
            current = os.path.dirname(os.path.abspath(__file__))
            
            # Walk up the directory tree looking for project markers
            while current != os.path.dirname(current):  # Stop at filesystem root
                # Look for CMakeLists.txt as the primary project marker
                cmake_file = os.path.join(current, 'CMakeLists.txt')
                if os.path.exists(cmake_file):
                    # Check if this is a build directory by looking for build artifacts
                    build_indicators = ['CMakeCache.txt', 'build.ninja', 'Makefile']
                    is_build_dir = any(os.path.exists(os.path.join(current, indicator)) 
                                     for indicator in build_indicators)
                    
                    if is_build_dir:
                        logging.info(f"Found CMakeLists.txt in build directory, continuing search: {current}")
                        # This is a build directory, continue searching
                        current = os.path.dirname(current)
                        continue
                    else:
                        logging.info(f"Found project root via CMakeLists.txt: {current}")
                        return current
                
                # Also check for other project markers as fallback
                markers = ['README.md', '.git', 'main.cpp']
                marker_count = sum(1 for marker in markers 
                                 if os.path.exists(os.path.join(current, marker)))
                
                # If we find multiple markers, this is likely the project root
                if marker_count >= 2:
                    logging.info(f"Found project root via multiple markers: {current}")
                    return current
                
                current = os.path.dirname(current)
            
            # Fallback: Use environment variable if set
            env_root = os.environ.get('RECALL_PROJECT_ROOT')
            if env_root and os.path.exists(env_root):
                logging.warning(f"Using environment variable for project root: {env_root}")
                return env_root
            
            # Check current working directory as a potential project root
            cwd = os.getcwd()
            cwd_cmake = os.path.join(cwd, 'CMakeLists.txt')
            if os.path.exists(cwd_cmake):
                # Check if CWD is a build directory
                build_indicators = ['CMakeCache.txt', 'build.ninja', 'Makefile']
                is_build_dir = any(os.path.exists(os.path.join(cwd, indicator)) 
                                 for indicator in build_indicators)
                
                if not is_build_dir:
                    logging.info(f"Using current working directory as project root: {cwd}")
                    return cwd
                else:
                    logging.warning(f"Current working directory appears to be a build directory: {cwd}")
            
            # Last resort: Use current working directory anyway
            logging.warning(f"Falling back to current working directory: {cwd}")
            return cwd
            
        except Exception as e:
            logging.error(f"Path resolution failed: {e}")
            raise PathResolutionError(f"Cannot determine project root: {e}")
    
    @staticmethod
    def get_project_root() -> str:
        """
        Determine the project root directory regardless of execution context.
        
        This method uses caching to avoid repeated file system operations.
        
        Returns:
            str: Absolute path to the project root directory
            
        Raises:
            PathResolutionError: If project root cannot be determined
        """
        return PathResolver._get_cached_value("project_root", PathResolver._compute_project_root)
    
    @classmethod
    def get_backend_dir(cls) -> str:
        """
        Get the backend directory path.
        
        Returns:
            str: Absolute path to the backend directory
        """
        return cls._get_cached_value("backend_dir", 
                                   lambda: os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    @classmethod
    def get_decks_dir(cls) -> str:
        """
        Get the decks directory path.
        
        Returns:
            str: Absolute path to the decks directory
        """
        return cls._get_cached_value("decks_dir", 
                                   lambda: os.path.join(cls.get_project_root(), 'decks'))
    
    @classmethod
    def get_static_dir(cls) -> str:
        """
        Get the static files directory path.
        
        Returns:
            str: Absolute path to the static directory
        """
        return cls._get_cached_value("static_dir", 
                                   lambda: os.path.join(cls.get_project_root(), 'static'))
    
    @classmethod
    def get_images_dir(cls) -> str:
        """
        Get the images directory path.
        
        Returns:
            str: Absolute path to the images directory
        """
        return cls._get_cached_value("images_dir", 
                                   lambda: os.path.join(cls.get_static_dir(), 'images'))
    
    @classmethod
    def get_processing_dir(cls) -> str:
        """
        Get the processing directory path.
        
        Returns:
            str: Absolute path to the processing directory
        """
        return cls._get_cached_value("processing_dir", 
                                   lambda: os.path.join(cls.get_project_root(), 'to_process'))
    
    @classmethod
    def get_logs_dir(cls) -> str:
        """
        Get the logs directory path.
        
        Returns:
            str: Absolute path to the logs directory
        """
        return cls._get_cached_value("logs_dir", 
                                   lambda: os.path.join(cls.get_backend_dir(), 'logs'))
    
    @classmethod
    def resolve_path(cls, relative_path: str) -> str:
        """
        Resolve a relative path to an absolute path based on project root.
        
        Args:
            relative_path: Path relative to project root
            
        Returns:
            str: Absolute path
        """
        if os.path.isabs(relative_path):
            return relative_path
        return os.path.join(cls.get_project_root(), relative_path)
    
    def _resolve_all_paths(self) -> PathConfig:
        """
        Resolve all application paths and create a configuration object.
        
        Returns:
            PathConfig: Configuration object with all resolved paths
        """
        try:
            project_root = self.get_project_root()
            backend_dir = self.get_backend_dir()
            
            config = PathConfig(
                project_root=project_root,
                decks_dir=os.path.join(project_root, 'decks'),
                static_dir=os.path.join(project_root, 'static'),
                images_dir=os.path.join(project_root, 'static', 'images'),
                processing_dir=os.path.join(project_root, 'to_process'),
                logs_dir=os.path.join(backend_dir, 'logs'),
                backend_dir=backend_dir
            )
            
            # Validate and create directories
            if not config.validate():
                raise PathResolutionError("Failed to validate or create required directories")
            
            # Log the resolved paths for debugging
            logging.info("PathResolver initialized with the following paths:")
            logging.info(f"  Project Root: {config.project_root}")
            logging.info(f"  Backend Dir: {config.backend_dir}")
            logging.info(f"  Decks Dir: {config.decks_dir}")
            logging.info(f"  Static Dir: {config.static_dir}")
            logging.info(f"  Images Dir: {config.images_dir}")
            logging.info(f"  Processing Dir: {config.processing_dir}")
            logging.info(f"  Logs Dir: {config.logs_dir}")
            
            return config
            
        except Exception as e:
            logging.error(f"Failed to resolve application paths: {e}")
            raise PathResolutionError(f"Path resolution failed: {e}")
    
    def get_config(self) -> PathConfig:
        """
        Get the current path configuration.
        
        Returns:
            PathConfig: The resolved path configuration
        """
        with self._lock:
            if self._config is None:
                self._config = self._resolve_all_paths()
            return self._config
    
    @classmethod
    def clear_cache(cls):
        """
        Clear all cached path values.
        
        This should be called if the file system structure changes
        or if you need to force re-resolution of paths.
        """
        cls._invalidate_cache()
        # Also clear the singleton's config to force re-resolution
        if cls._instance is not None:
            cls._instance._config = None
    
    def ensure_directory_exists(self, path: str) -> bool:
        """
        Ensure a directory exists, creating it if necessary.
        
        Args:
            path: Directory path to ensure exists
            
        Returns:
            bool: True if directory exists or was created successfully
        """
        try:
            if not os.path.exists(path):
                os.makedirs(path, exist_ok=True)
                logging.info(f"Created directory: {path}")
            return True
        except Exception as e:
            logging.error(f"Failed to create directory {path}: {e}")
            return False
    
    def validate_path_security(self, path: str) -> bool:
        """
        Validate that a path is within expected directories for security.
        
        Args:
            path: Path to validate
            
        Returns:
            bool: True if path is safe to use
        """
        try:
            # Resolve to absolute path
            abs_path = os.path.abspath(path)
            project_root = self.get_project_root()
            
            # Check if path is within project root
            return abs_path.startswith(project_root)
        except Exception as e:
            logging.error(f"Path security validation failed for {path}: {e}")
            return False


# Convenience functions for backward compatibility and ease of use
def get_project_root() -> str:
    """Convenience function to get project root."""
    return PathResolver.get_project_root()


def get_decks_dir() -> str:
    """Convenience function to get decks directory."""
    return PathResolver.get_decks_dir()


def get_static_dir() -> str:
    """Convenience function to get static directory."""
    return PathResolver.get_static_dir()


def get_images_dir() -> str:
    """Convenience function to get images directory."""
    return PathResolver.get_images_dir()


def get_processing_dir() -> str:
    """Convenience function to get processing directory."""
    return PathResolver.get_processing_dir()


def get_logs_dir() -> str:
    """Convenience function to get logs directory."""
    return PathResolver.get_logs_dir()


def resolve_path(relative_path: str) -> str:
    """Convenience function to resolve relative paths."""
    return PathResolver.resolve_path(relative_path)


def ensure_directory_exists(path: str) -> bool:
    """Convenience function to ensure directory exists."""
    resolver = PathResolver()
    return resolver.ensure_directory_exists(path)