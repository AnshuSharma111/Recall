from .logger_config import config_logger, get_logger
from . import file_operations

# Pre-configure the logger when utils package is imported
config_logger()