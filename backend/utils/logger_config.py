import logging
import sys
import os

# Module-wide singleton logger
_logger = None 
_logger_initialized = False  # Track if we've initialized the logger

# Directly exportable logger - other modules should import this
logger = None

def config_logger():
    """Configure and return the logger singleton. This should typically only be called once in the main module."""
    global _logger, _logger_initialized, logger
    if _logger is not None:
        return _logger
    
    _logger = logging.getLogger("Recall")

    if not _logger.hasHandlers():
        _logger.setLevel(logging.DEBUG)

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)

        # Use an absolute path to the log file in a dedicated logs directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logs_dir = os.path.join(backend_dir, "logs")
        # Create logs directory if it doesn't exist
        os.makedirs(logs_dir, exist_ok=True)
        
        log_path = os.path.join(logs_dir, "recall.log")
        file_handler = logging.FileHandler(log_path)
        file_handler.setLevel(logging.INFO)

        formatter = logging.Formatter(
            "%(asctime)s | %(name)s | %(levelname)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )

        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)

        _logger.addHandler(console_handler)
        _logger.addHandler(file_handler)

        _logger.propagate = False

    # Set the exportable logger to the configured logger
    global logger
    logger = _logger
    
    # Track that we've initialized the logger and handle first-time initialization messages
    global _logger_initialized
    if not _logger_initialized:
        _logger_initialized = True
    
    return _logger

def get_logger():
    """
    Get the configured logger instance. If the logger hasn't been initialized yet,
    this will initialize it.
    
    Other modules should use this function to get the logger instance:
    
    from utils.logger_config import get_logger
    logger = get_logger()
    
    """
    global logger, _logger
    if logger is None:
        # If the logger hasn't been initialized yet, initialize it
        config_logger()
    return logger