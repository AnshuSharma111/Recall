"""
Optimized OCR processing module with performance enhancements.

This module provides optimized OCR processing with:
- Memory-efficient image handling
- Parallel processing capabilities
- Result caching
- Progressive processing for large documents
"""

import os
import json
import time
import threading
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import cv2
import numpy as np
from paddleocr import PaddleOCR, FormulaRecognition
from utils.logger_config import get_logger
# Import performance optimizer with fallback
try:
    from utils.performance_optimizer import (
        get_memory_manager, get_processing_pool, get_file_cache,
        performance_monitor, cached_function
    )
    PERFORMANCE_OPTIMIZER_AVAILABLE = True
except ImportError:
    # Fallback implementations when performance optimizer is not available
    PERFORMANCE_OPTIMIZER_AVAILABLE = False
    
    def get_memory_manager():
        return None
    
    def get_processing_pool():
        return None
    
    def get_file_cache():
        return None
    
    def performance_monitor(func):
        return func  # No-op decorator
    
    def cached_function(cache_key_func=None, ttl=3600):
        def decorator(func):
            return func  # No-op decorator
        return decorator

logger = get_logger()

class OptimizedOCRProcessor:
    """Optimized OCR processor with caching and parallel processing."""
    
    def __init__(self):
        self._ocr_model = None
        self._formula_model = None
        self._model_lock = threading.Lock()
        
        # Initialize performance components if available
        if PERFORMANCE_OPTIMIZER_AVAILABLE:
            self._memory_manager = get_memory_manager()
            self._processing_pool = get_processing_pool()
            self._cache = get_file_cache()
            
            # Register cleanup callback
            if self._memory_manager:
                self._memory_manager.register_cleanup_callback(self._cleanup_models)
        else:
            self._memory_manager = None
            self._processing_pool = None
            self._cache = None
    
    def _get_ocr_model(self):
        """Get OCR model with lazy loading."""
        if self._ocr_model is None:
            with self._model_lock:
                if self._ocr_model is None:
                    logger.info("Loading PaddleOCR model...")
                    self._ocr_model = PaddleOCR(
                        use_angle_cls=True,
                        lang='en',
                        show_log=False,
                        use_gpu=False  # Set to True if GPU available
                    )
                    logger.info("PaddleOCR model loaded successfully")
        return self._ocr_model
    
    def _get_formula_model(self):
        """Get formula recognition model with lazy loading."""
        if self._formula_model is None:
            with self._model_lock:
                if self._formula_model is None:
                    logger.info("Loading Formula Recognition model...")
                    self._formula_model = FormulaRecognition()
                    logger.info("Formula Recognition model loaded successfully")
        return self._formula_model
    
    def _cleanup_models(self):
        """Cleanup loaded models to free memory."""
        with self._model_lock:
            if self._ocr_model is not None:
                del self._ocr_model
                self._ocr_model = None
                logger.info("Cleaned up OCR model")
            
            if self._formula_model is not None:
                del self._formula_model
                self._formula_model = None
                logger.info("Cleaned up Formula model")
    
    @performance_monitor
    def _process_image_chunk(self, image_path: str, bbox: List[int], chunk_type: str) -> Dict[str, Any]:
        """Process a single image chunk with caching."""
        # Generate cache key based on image path, bbox, and file modification time
        try:
            mtime = os.path.getmtime(image_path)
            cache_key = f"ocr_{hash(image_path)}_{hash(str(bbox))}_{chunk_type}_{mtime}"
            
            # Try to get from cache if available
            if self._cache:
                cached_result = self._cache.get_cached_result(cache_key, image_path)
                if cached_result is not None:
                    logger.debug(f"Cache hit for OCR chunk: {cache_key}")
                    return cached_result
            
            # Process the chunk
            result = self._process_chunk_internal(image_path, bbox, chunk_type)
            
            # Cache the result if cache is available
            if self._cache:
                self._cache.cache_result(cache_key, result, image_path)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing image chunk: {e}")
            return {'error': str(e), 'text': '', 'confidence': 0.0}
    
    def _process_chunk_internal(self, image_path: str, bbox: List[int], chunk_type: str) -> Dict[str, Any]:
        """Internal method to process a chunk without caching."""
        try:
            # Load and crop image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            x1, y1, x2, y2 = bbox
            cropped = image[y1:y2, x1:x2]
            
            if cropped.size == 0:
                return {'text': '', 'confidence': 0.0, 'type': chunk_type}
            
            result = {'type': chunk_type, 'bbox': bbox}
            
            if chunk_type == 'formula':
                # Use formula recognition
                formula_model = self._get_formula_model()
                formula_result = formula_model(cropped)
                
                if formula_result and len(formula_result) > 0:
                    result['text'] = formula_result[0]
                    result['confidence'] = 0.9  # Formula recognition doesn't provide confidence
                else:
                    result['text'] = ''
                    result['confidence'] = 0.0
            
            else:
                # Use regular OCR
                ocr_model = self._get_ocr_model()
                ocr_result = ocr_model.ocr(cropped, cls=True)
                
                if ocr_result and len(ocr_result) > 0 and ocr_result[0]:
                    # Extract text and confidence
                    texts = []
                    confidences = []
                    
                    for line in ocr_result[0]:
                        if len(line) >= 2:
                            text = line[1][0] if line[1] else ''
                            confidence = line[1][1] if len(line[1]) > 1 else 0.0
                            
                            texts.append(text)
                            confidences.append(confidence)
                    
                    result['text'] = ' '.join(texts)
                    result['confidence'] = sum(confidences) / len(confidences) if confidences else 0.0
                else:
                    result['text'] = ''
                    result['confidence'] = 0.0
            
            # Cleanup memory
            del cropped
            del image
            
            return result
            
        except Exception as e:
            logger.error(f"Error in chunk processing: {e}")
            return {'error': str(e), 'text': '', 'confidence': 0.0, 'type': chunk_type}
    
    @performance_monitor
    def process_document_parallel(self, base_dir: str, max_workers: int = None) -> Dict[str, Any]:
        """Process entire document with parallel processing."""
        if max_workers is None:
            max_workers = min(4, os.cpu_count() or 1)  # Conservative default
        
        logger.info(f"Starting parallel OCR processing of {base_dir} with {max_workers} workers")
        
        results = {}
        total_chunks = 0
        processed_chunks = 0
        
        try:
            # Collect all processing tasks
            tasks = []
            
            for doc_dir in os.listdir(base_dir):
                doc_path = os.path.join(base_dir, doc_dir)
                if not os.path.isdir(doc_path):
                    continue
                
                json_dir = os.path.join(doc_path, 'json')
                images_dir = os.path.join(doc_path, 'images')
                
                if not (os.path.exists(json_dir) and os.path.exists(images_dir)):
                    continue
                
                # Process each JSON file
                for json_file in os.listdir(json_dir):
                    if not json_file.endswith('.json'):
                        continue
                    
                    json_path = os.path.join(json_dir, json_file)
                    image_name = json_file.replace('.json', '')
                    image_path = os.path.join(images_dir, image_name)
                    
                    if not os.path.exists(image_path):
                        continue
                    
                    # Load layout detection results
                    try:
                        with open(json_path, 'r') as f:
                            layout_data = json.load(f)
                        
                        # Create tasks for each detected element
                        for element in layout_data:
                            bbox = element.get('bbox', [])
                            element_type = element.get('type', 'text')
                            
                            if len(bbox) == 4:
                                task_id = f"{doc_dir}_{json_file}_{len(tasks)}"
                                tasks.append({
                                    'task_id': task_id,
                                    'image_path': image_path,
                                    'bbox': bbox,
                                    'element_type': element_type,
                                    'doc_dir': doc_dir,
                                    'json_file': json_file
                                })
                                total_chunks += 1
                    
                    except Exception as e:
                        logger.error(f"Error loading layout data from {json_path}: {e}")
            
            logger.info(f"Prepared {total_chunks} OCR tasks for parallel processing")
            
            # Process tasks in parallel
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all tasks
                future_to_task = {}
                for task in tasks:
                    future = executor.submit(
                        self._process_image_chunk,
                        task['image_path'],
                        task['bbox'],
                        task['element_type']
                    )
                    future_to_task[future] = task
                
                # Collect results as they complete
                for future in as_completed(future_to_task):
                    task = future_to_task[future]
                    processed_chunks += 1
                    
                    try:
                        chunk_result = future.result()
                        
                        # Organize results by document and page
                        doc_dir = task['doc_dir']
                        json_file = task['json_file']
                        
                        if doc_dir not in results:
                            results[doc_dir] = {}
                        
                        if json_file not in results[doc_dir]:
                            results[doc_dir][json_file] = []
                        
                        results[doc_dir][json_file].append(chunk_result)
                        
                        # Log progress
                        if processed_chunks % 10 == 0 or processed_chunks == total_chunks:
                            logger.info(f"OCR progress: {processed_chunks}/{total_chunks} chunks processed")
                    
                    except Exception as e:
                        logger.error(f"Task failed: {e}")
            
            # Save results to files
            self._save_ocr_results(base_dir, results)
            
            logger.info(f"Parallel OCR processing completed: {processed_chunks}/{total_chunks} chunks")
            
            return {
                'success': True,
                'total_chunks': total_chunks,
                'processed_chunks': processed_chunks,
                'documents': len(results)
            }
        
        except Exception as e:
            logger.error(f"Error in parallel OCR processing: {e}")
            return {
                'success': False,
                'error': str(e),
                'total_chunks': total_chunks,
                'processed_chunks': processed_chunks
            }
    
    def _save_ocr_results(self, base_dir: str, results: Dict[str, Any]):
        """Save OCR results to files."""
        try:
            for doc_dir, doc_results in results.items():
                doc_path = os.path.join(base_dir, doc_dir)
                ocr_results_dir = os.path.join(doc_path, 'ocr_results')
                os.makedirs(ocr_results_dir, exist_ok=True)
                
                for json_file, chunks in doc_results.items():
                    # Create output filename
                    base_name = json_file.replace('.json', '')
                    output_file = os.path.join(ocr_results_dir, f"{base_name}_processed.json")
                    
                    # Organize chunks by type
                    organized_results = {
                        'text_chunks': [],
                        'formula_chunks': [],
                        'table_chunks': [],
                        'image_chunks': [],
                        'metadata': {
                            'total_chunks': len(chunks),
                            'processing_time': time.time(),
                            'source_image': base_name
                        }
                    }
                    
                    for chunk in chunks:
                        chunk_type = chunk.get('type', 'text')
                        if chunk_type == 'formula':
                            organized_results['formula_chunks'].append(chunk)
                        elif chunk_type == 'table':
                            organized_results['table_chunks'].append(chunk)
                        elif chunk_type == 'image':
                            organized_results['image_chunks'].append(chunk)
                        else:
                            organized_results['text_chunks'].append(chunk)
                    
                    # Save results
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(organized_results, f, indent=2, ensure_ascii=False)
                    
                    logger.debug(f"Saved OCR results to {output_file}")
        
        except Exception as e:
            logger.error(f"Error saving OCR results: {e}")

# Global instance
_ocr_processor = None

def get_ocr_processor() -> OptimizedOCRProcessor:
    """Get the global OCR processor instance."""
    global _ocr_processor
    if _ocr_processor is None:
        _ocr_processor = OptimizedOCRProcessor()
    return _ocr_processor

@performance_monitor
def process_document_dir_optimized(base_dir: str, max_workers: int = None) -> Dict[str, Any]:
    """
    Optimized version of document OCR processing with parallel execution.
    
    Args:
        base_dir: Base directory containing document subdirectories
        max_workers: Maximum number of worker threads (default: auto-detect)
    
    Returns:
        Dictionary with processing results and statistics
    """
    processor = get_ocr_processor()
    return processor.process_document_parallel(base_dir, max_workers)

# Backward compatibility function
def process_document_dir(base_dir: str):
    """
    Backward compatible function for existing code.
    """
    result = process_document_dir_optimized(base_dir)
    return result.get('success', False)