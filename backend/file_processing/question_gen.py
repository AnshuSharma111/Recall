import os
import json
import logging
import re
import base64
import time
import shutil
import traceback
from datetime import datetime
from typing import Optional, Dict, Any, List, Union

# Set up basic logging for when this module is run directly for testing
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import PathResolver for centralized path management
try:
    from utils.path_resolver import PathResolver
    path_resolver = PathResolver()
    path_config = path_resolver.get_config()
except ImportError:
    logger.error("PathResolver not available - using fallback paths")
    path_resolver = None
    path_config = None

# Import Groq for API calls
try:
    from groq import Groq
except ImportError:
    logger.warning("Groq library not installed. Question generation requires 'groq' package.")
    Groq = None

# Function to encode an image to base64
def encode_image(image_path: str) -> Optional[str]:
    """
    Encode an image file to base64 string
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Base64 encoded image string or None if encoding fails
    """
    if not os.path.exists(image_path):
        logger.error(f"Image file not found: {image_path}")
        return None
        
    if not os.path.isfile(image_path):
        logger.error(f"Path is not a file: {image_path}")
        return None
    
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except PermissionError:
        logger.error(f"Permission denied when reading image: {image_path}")
        return None
    except IOError as e:
        logger.error(f"IO error when reading image {image_path}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error encoding image {image_path}: {e}")
        return None

def generate_questions_from_json(json_file_path: str, res_dir: str = "./output/questions", model: str = "openai/gpt-oss-120b") -> Optional[str]:
    """
    Generate flashcard questions using Groq API from a JSON file containing document content.
    
    Args:
        json_file_path (str): Path to the input JSON file with extracted document content
        res_dir (str): Directory to save the generated questions
        model (str): Groq model to use for question generation
        
    Returns:
        Optional[str]: Path to the generated questions JSON file or None if generation failed
    """
    # Check if Groq client is available
    if Groq is None:
        logger.error("Groq client not available. Cannot generate questions.")
        return None
        
    # Check if API key is set
    if not os.environ.get("GROQ_API_KEY"):
        logger.error("GROQ_API_KEY environment variable not set")
        return None
    
    try:
        # Import utility function for directory creation
        from utils.file_operations import ensure_dir
        
        # Create output directory if it doesn't exist
        ensure_dir(res_dir)
        
        # Convert relative path to absolute if needed
        if not os.path.isabs(json_file_path):
            # Try to find the absolute path
            abs_path = os.path.abspath(json_file_path)
            logger.info(f"Converting relative path {json_file_path} to absolute: {abs_path}")
            json_file_path = abs_path
        
        # Check if input file exists
        if not os.path.exists(json_file_path):
            logger.error(f"Input JSON file not found: {json_file_path}")
            return None
        
        # Load the JSON file with document content
        logger.info(f"Reading input file: {json_file_path}")
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                doc_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON format in {json_file_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading input file {json_file_path}: {e}")
            return None
            
        # Extract the text content and images from the document - based on known OCR output structure
        content = ""
        images = []
        
        # Standard OCR output format from ocr.py: {"text": [], "formulae": [], "imgs": []}
        if isinstance(doc_data, dict):
            # Get text content
            if "text" in doc_data and isinstance(doc_data["text"], list):
                content = "\n\n".join(doc_data["text"])
                logger.info(f"Found {len(doc_data['text'])} text segments")
                
            # Add formulae to content if available
            if "formulae" in doc_data and isinstance(doc_data["formulae"], list) and doc_data["formulae"]:
                formulae_content = "\n\nFormulae:\n" + "\n".join(doc_data["formulae"])
                content += formulae_content
                logger.info(f"Added {len(doc_data['formulae'])} formulae to content")
                
            # Extract image paths - check for different key names used in JSON formats
            images = []
            if "imgs" in doc_data and isinstance(doc_data["imgs"], list):
                images = doc_data["imgs"]
                logger.info(f"Found {len(images)} images in the document from 'imgs' key")
            elif "images" in doc_data and isinstance(doc_data["images"], list):
                images = doc_data["images"]
                logger.info(f"Found {len(images)} images in the document from 'images' key")
            elif "input_path" in doc_data:
                # This might be a single image OCR result
                input_path = doc_data["input_path"]
                if isinstance(input_path, str) and os.path.exists(input_path):
                    images = [input_path]
                    logger.info(f"Using input_path as image source: {input_path}")
                elif isinstance(input_path, str):
                    # Try to find the image using relative path
                    base_dir = os.path.dirname(json_file_path)
                    potential_img_path = os.path.join(base_dir, input_path)
                    potential_img_path = potential_img_path.replace('\\\\', '\\')
                    if os.path.exists(potential_img_path):
                        images = [potential_img_path]
                        logger.info(f"Found image using relative path: {potential_img_path}")
                    else:
                        logger.warning(f"Could not find image at path: {input_path}")
            
        if not content and not images:
            logger.warning(f"No content or images found in {json_file_path}")
            return None
            
        # Prepare image data if available
        image_data = []
        for i, img_path in enumerate(images):
            # Normalize path separators to use OS-specific ones
            normalized_path = os.path.normpath(img_path)
            logger.info(f"Processing image: {normalized_path}")
            
            # Verify if the image exists at the given path
            if not os.path.exists(normalized_path):
                # Try to find the image using relative paths
                base_dir = os.path.dirname(json_file_path)
                potential_paths = [
                    os.path.join(base_dir, os.path.basename(normalized_path)),  # Same dir as JSON
                    os.path.join(base_dir, "images", os.path.basename(normalized_path)),  # images subdir
                    os.path.join(os.path.dirname(base_dir), "images", os.path.basename(normalized_path)),  # parent/images
                ]
                
                for potential_path in potential_paths:
                    if os.path.exists(potential_path):
                        normalized_path = potential_path
                        logger.info(f"Found image at alternate path: {normalized_path}")
                        break
                else:
                    logger.warning(f"Image not found: {normalized_path}")
                    continue
            
            base64_image = encode_image(normalized_path)
            if base64_image:
                image_data.append({
                    "path": normalized_path,
                    "base64": base64_image,
                    "index": i
                })
                
        # Construct the prompt for question generation with image awareness
        prompt = f"""You are a specialized flashcard generator. Your task is to create EXACTLY 8 high-quality educational questions based on the provided content.

CRITICAL: You MUST output valid JSON with no markdown formatting or explanatory text. Output only the JSON object.

REQUIRED OUTPUT FORMAT:
{{
  "questions": [
    {{
      "question_type": "string",  // Must be one of these exact types: "flashcard", "cloze", "true_false", "multi_choice"
      "question": "string",       // The actual question text
      "answer": "string",         // For flashcard, cloze, true_false types
      "tags": ["string"],         // Array of relevant topic tags (2-5 tags)
      "img_path": "string|null",  // Path to related image if question refers to an image, otherwise null
      
      // FOR MULTI_CHOICE QUESTIONS ONLY - include these additional fields:
      "options": [
        {{
          "choice": "string",     // Text of this option
          "is_correct": boolean   // Must be true for the correct answer, false for others
        }},
        // Include 3-4 options total, with exactly ONE having is_correct: true
      ],
      "correct_choice": "string"  // Duplicate of the correct option text for easy reference
    }},
    // ALWAYS generate exactly 8 questions total
  ]
}}

VALID QUESTION TYPES AND FORMATS:

1. Flashcard (question → answer):
{{
  "question_type": "flashcard",
  "question": "What is the capital of France?",
  "answer": "Paris",
  "tags": ["geography", "capitals", "europe"],
  "img_path": null
}}

2. Cloze (fill-in-the-blank):
{{
  "question_type": "cloze",
  "question": "_____ is the largest planet in our solar system.",
  "answer": "Jupiter",
  "tags": ["astronomy", "planets", "solar system"],
  "img_path": null
}}

3. True/False:
{{
  "question_type": "true_false",
  "question": "The Pacific Ocean is the largest ocean on Earth.",
  "answer": "true",
  "tags": ["geography", "oceans"],
  "img_path": null
}}

4. Multi-choice:
{{
  "question_type": "multi_choice",
  "question": "Which of the following is a prime number?",
  "options": [
    {{"choice": "4", "is_correct": false}},
    {{"choice": "7", "is_correct": true}},
    {{"choice": "9", "is_correct": false}},
    {{"choice": "15", "is_correct": false}}
  ],
  "correct_choice": "7",
  "tags": ["mathematics", "numbers", "prime numbers"],
  "img_path": null
}}

IMPORTANT: Your output MUST be a single, valid JSON object that can be parsed directly with json.loads().

Content:
{content}

You may use the provided image(s) to frame questions. If a question relates to an image, 
set the "img_path" field to the path of the image used as reference. Otherwise, set it to null.

Return ONLY valid JSON without any explanation or markdown formatting.
"""

        # Initialize Groq client
        try:
            client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        except Exception as e:
            logger.error(f"Error initializing Groq client: {e}")
            return None

        # Choose model based on whether we have images
        if image_data and "llama" in model:
            # For models that support image inputs, use meta-llama/llama-4-scout which has vision capabilities
            model = "meta-llama/llama-4-scout-17b-16e-instruct"
            logger.info(f"Using vision-capable model: {model}")
            
        logger.info(f"Calling Groq API with model {model}")
        
        # Prepare message content based on whether we have images
        if image_data:
            # Groq API doesn't support multimodal content in the format we initially tried
            # Instead, we'll use text-only mode with image paths in the prompt
            logger.info(f"Including {len(image_data)} image references in text prompt")
            
            # Include image paths in the text prompt
            img_paths_text = "\n\nAvailable images:\n"
            for i, img in enumerate(image_data):
                img_paths_text += f"Image {i+1}: {img['path']}\n"
            
            final_prompt = prompt + img_paths_text
        else:
            # Text-only prompt
            final_prompt = prompt
        
        # API call with retry logic
        max_retries = 3  # Increased from 2 to 3 for better reliability
        retry_count = 0
        retry_delay = 2  # seconds
        response = None
        
        while retry_count < max_retries:
            try:
                logger.info(f"Calling Groq API (attempt {retry_count+1}/{max_retries})")
                
                # Make the API call
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a specialized educational content creator that generates high-quality flashcards and questions."},
                        {"role": "user", "content": final_prompt}
                    ],
                    temperature=0.3,  # Lower temperature for more consistent output
                    max_tokens=4000,
                    response_format={"type": "json_object"}  # Request JSON format explicitly
                )
                
                # If we get here, the API call succeeded
                logger.info("Groq API call successful")
                break
                
            except Exception as api_error:
                retry_count += 1
                logger.warning(f"API call failed (attempt {retry_count}/{max_retries}): {str(api_error)}")
                
                # Check for different error types and handle accordingly
                error_str = str(api_error).lower()
                
                if "rate_limit" in error_str or "429" in error_str:
                    # Rate limit errors - use exponential backoff
                    logger.warning(f"Rate limit exceeded, retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                elif "timeout" in error_str or "connection" in error_str:
                    # Network errors - retry with fixed delay
                    logger.warning(f"Network error, retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                elif retry_count >= max_retries:
                    # Max retries reached
                    logger.error(f"API call failed after {max_retries} attempts: {str(api_error)}")
                    return None
                else:
                    # Other non-retriable errors
                    logger.error(f"Non-retriable API error: {str(api_error)}")
                    return None

        # Check if we got a response
        if response is None:
            logger.error("No response received from API after retries")
            return None

        try:
            # Extract the generated questions from the response
            result_text = response.choices[0].message.content
    
            # Check if result_text is None or empty
            if not result_text:
                logger.error("Empty response from Groq API")
                return None
     
            logger.debug(f"Raw API response (first 200 chars): {result_text[:200]}...")
    
            # Process and validate the API response
            questions = None
            
            # Log complete response for debugging (but limit length)
            if len(result_text) > 1000:
                logger.debug(f"API response (truncated): {result_text[:500]}...{result_text[-500:]}")
            else:
                logger.debug(f"Complete API response: {result_text}")
            
            # First attempt: Try parsing the response directly
            try:
                questions = json.loads(result_text)
                logger.info("Successfully parsed JSON response directly")
                
                # Check if we got a proper questions structure
                if isinstance(questions, dict) and "questions" in questions:
                    logger.info(f"Found questions array with {len(questions['questions'])} items")
                elif isinstance(questions, list):
                    logger.info(f"Found direct questions list with {len(questions)} items")
                    # Wrap list in a questions object
                    questions = {"questions": questions}
                else:
                    logger.warning(f"Unexpected JSON structure: {type(questions)}")
                    
            except json.JSONDecodeError:
                # Second attempt: Try to extract JSON object from text with potential markdown or explanation
                logger.warning("Direct JSON parsing failed, trying to extract JSON block")
                
                # First clean the text - remove markdown code blocks
                cleaned_text = re.sub(r'```(?:json)?|```', '', result_text).strip()
                
                # Look for JSON object with questions array - using improved regex pattern
                object_pattern = r'\{[\s\S]*?"questions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}'
                object_match = re.search(object_pattern, cleaned_text, re.DOTALL)
                
                if object_match:
                    extracted_text = object_match.group(0)
                    try:
                        questions = json.loads(extracted_text)
                        logger.info("Successfully extracted questions JSON object using regex")
                    except json.JSONDecodeError as e:
                        logger.error(f"Extracted text is not valid JSON: {str(e)}")
                        logger.debug(f"Extracted text: {extracted_text[:200]}...")
                        # Continue to next extraction method
                
                # If no questions object found or extraction failed, look for a direct JSON array
                if questions is None and '[' in cleaned_text and ']' in cleaned_text:
                    # Try to find JSON array with balanced brackets
                    array_pattern = r'\[([\s\S]*?)\]'
                    array_match = re.search(array_pattern, cleaned_text, re.DOTALL)
                    
                    if array_match:
                        json_str = f"[{array_match.group(1)}]"
                        try:
                            array_json = json.loads(json_str)
                            questions = {"questions": array_json}
                            logger.info("Successfully extracted questions array using regex")
                        except json.JSONDecodeError:
                            # Try a more basic approach
                            json_start = cleaned_text.find('[')
                            json_end = cleaned_text.rfind(']') + 1
                            if json_start >= 0 and json_end > json_start:
                                json_str = cleaned_text[json_start:json_end]
                                try:
                                    array_json = json.loads(json_str)
                                    questions = {"questions": array_json}
                                    logger.info("Successfully extracted questions array using start/end index")
                                except json.JSONDecodeError:
                                    logger.error("Extracted array is not valid JSON")
                    else:
                        logger.error("Could not find a valid JSON array pattern")
                
                # If we still don't have valid questions, one last attempt
                if questions is None:
                    # Final attempt: Try to match any valid JSON object
                    object_pattern = r'\{[\s\S]*?\}'
                    object_matches = re.finditer(object_pattern, cleaned_text, re.DOTALL)
                    
                    for match in object_matches:
                        try:
                            potential_obj = json.loads(match.group(0))
                            if isinstance(potential_obj, dict):
                                if "questions" in potential_obj:
                                    questions = potential_obj
                                    logger.info("Found questions in JSON object with generic pattern")
                                    break
                                # If we find a valid object but no questions, keep it as a fallback
                                if questions is None:
                                    questions = {"questions": [potential_obj]}
                        except json.JSONDecodeError:
                            continue
                    
            if questions is None:
                logger.error("Could not extract valid JSON from response after all attempts")
                return None
                
        except Exception as e:
            logger.error(f"Error processing API response: {str(e)}")
            return None
                
        # Validate that we have questions to save
        if questions is None:
            logger.error("No questions were generated")
            return None
        
        # Check for API error responses that might have been parsed as JSON
        if isinstance(questions, dict) and "error" in questions:
            if isinstance(questions["error"], dict) and "message" in questions["error"]:
                error_msg = questions["error"]["message"]
            else:
                error_msg = str(questions["error"])
            logger.error(f"API error response: {error_msg}")
            return None
            
        # Define validation functions for clean structure
        def validate_question_structure(q_data: Any) -> bool:
            """Validates if the question data has the correct high-level structure"""
            if isinstance(q_data, dict) and "questions" in q_data and isinstance(q_data["questions"], list):
                return len(q_data["questions"]) > 0
            elif isinstance(q_data, list) and len(q_data) > 0:
                return True
            return False
            
        def validate_question_items(items: Any) -> bool:
            """Validates if individual question items have valid structure"""
            # Ensure we have a list to work with
            if not isinstance(items, list):
                return False
                
            questions_list = items
                
            # Check for arrays of strings (invalid format)
            if all(isinstance(item, str) for item in questions_list):
                logger.error("Invalid format: array of strings instead of question objects")
                return False
                
            # Count valid questions
            valid_count = 0
            for i, q in enumerate(questions_list):
                if not isinstance(q, dict):
                    logger.warning(f"Question {i} is not a dictionary object, skipping")
                    continue
                    
                if "question_type" not in q or "question" not in q:
                    logger.warning(f"Question {i} missing required fields, skipping")
                    continue
                    
                # Validate multi-choice questions have proper options
                if q.get("question_type") == "multi_choice" and "options" not in q:
                    logger.warning(f"Multi-choice question {i} missing options, will create default options")
                    # Will be fixed in validation step
                
                valid_count += 1
                
            # At least some valid questions
            return valid_count > 0
            
        # Perform structure validation
        if not validate_question_structure(questions):
            logger.error("Questions data has invalid structure")
            return None
            
        # Get source questions based on structure
        source_questions = []
        if isinstance(questions, dict) and "questions" in questions and isinstance(questions["questions"], list):
            source_questions = questions["questions"]
        elif isinstance(questions, list):
            source_questions = questions
            
        # Validate question items
        if not validate_question_items(source_questions):
            logger.error("No valid questions found in the data")
            return None
        
        # Standardize the response structure if needed
        if isinstance(questions, list):
            questions = {"questions": questions}
        elif isinstance(questions, dict) and "questions" not in questions:
            questions = {"questions": [questions]}
            
        # Create a new list of validated questions
        validated_questions = []
        
        # Process and validate each question
        for i, q in enumerate(source_questions):
            # Skip non-dict questions
            if not isinstance(q, dict):
                logger.warning(f"Skipping non-dict question {i}")
                continue
                
            # Create a new validated question with default values
            valid_q = {
                "question_type": q.get("question_type", "flashcard"),
                "question": q.get("question", f"Question {i+1}"),
                "tags": q.get("tags", ["general"]),
                "img_path": q.get("img_path", None)
            }
            
            # Normalize question type to one of the supported types
            valid_types = ["flashcard", "cloze", "true_false", "multi_choice"]
            if valid_q["question_type"] not in valid_types:
                logger.warning(f"Invalid question type '{valid_q['question_type']}' for question {i}, defaulting to 'flashcard'")
                valid_q["question_type"] = "flashcard"
            
            # Ensure tags is a list
            if not isinstance(valid_q["tags"], list):
                if isinstance(valid_q["tags"], str):
                    # Convert single string to list
                    valid_q["tags"] = [valid_q["tags"]]
                else:
                    # Default tags
                    valid_q["tags"] = ["general"]
            
            # Handle different question types
            if valid_q["question_type"] == "multi_choice":
                options = []
                correct_choice = None
                
                # Case 1: Options already in correct format
                if "options" in q and isinstance(q["options"], list):
                    for opt in q["options"]:
                        if isinstance(opt, dict) and "choice" in opt and "is_correct" in opt:
                            options.append({
                                "choice": str(opt["choice"]),
                                "is_correct": bool(opt["is_correct"])
                            })
                            if opt["is_correct"]:
                                correct_choice = str(opt["choice"])
                
                # Case 2: Options as strings
                if not options and "options" in q and isinstance(q["options"], list):
                    answer = str(q.get("answer", ""))
                    for opt in q["options"]:
                        if isinstance(opt, str):
                            is_correct = (opt == answer)
                            options.append({
                                "choice": opt,
                                "is_correct": is_correct
                            })
                            if is_correct:
                                correct_choice = opt
                
                # Case 3: No options but has answer
                if not options and "answer" in q:
                    answer = str(q["answer"])
                    options = [
                        {"choice": answer, "is_correct": True},
                        {"choice": f"Not {answer}", "is_correct": False},
                        {"choice": f"Alternative to {answer}", "is_correct": False}
                    ]
                    correct_choice = answer
                
                # Case 4: Neither options nor answer
                if not options:
                    options = [
                        {"choice": "Option A", "is_correct": True},
                        {"choice": "Option B", "is_correct": False},
                        {"choice": "Option C", "is_correct": False}
                    ]
                    correct_choice = "Option A"
                
                # Ensure at least one correct option
                has_correct = any(opt["is_correct"] for opt in options)
                if not has_correct and options:
                    options[0]["is_correct"] = True
                    correct_choice = options[0]["choice"]
                    
                # Set the options and correct_choice
                valid_q["options"] = options
                valid_q["correct_choice"] = correct_choice or options[0]["choice"]
                
            else:
                # For other question types
                valid_q["answer"] = str(q.get("answer", ""))
                
                # For true_false type, normalize answer to "true" or "false"
                if valid_q["question_type"] == "true_false":
                    answer_lower = valid_q["answer"].lower()
                    if answer_lower in ["true", "t", "yes", "y", "1"]:
                        valid_q["answer"] = "true"
                    else:
                        valid_q["answer"] = "false"
            
            # Add the validated question
            validated_questions.append(valid_q)
            
        # Replace with validated questions
        questions = {"questions": validated_questions}
        
        # Final check: ensure we have at least one question
        if len(validated_questions) == 0:
            logger.error("No valid questions could be extracted from API response")
            return None
            
        logger.info(f"Successfully validated {len(validated_questions)} questions")
        
        # Save the generated questions to a file
        try:
            base_filename = os.path.basename(json_file_path)
            output_filename = f"{os.path.splitext(base_filename)[0]}_questions.json"
            output_path = os.path.join(res_dir, output_filename)
            
            # Make sure the output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Create complete output structure with metadata
            output_data = {
                "questions": questions["questions"],
                "metadata": {
                    "source_file": json_file_path,
                    "created_at": datetime.now().isoformat(),
                    "model_used": model,
                    "question_count": len(questions["questions"])
                }
            }
            
            try:
                # Import utility function for file operations
                from utils.file_operations import ensure_dir
                
                # Ensure the directory exists
                ensure_dir(os.path.dirname(output_path))
                
                # Write to file with pretty formatting
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, ensure_ascii=False, indent=2)
                
                # Log information about the generated questions
                question_count = output_data["metadata"]["question_count"]
                logger.info(f"Generated {question_count} questions")
                logger.info(f"Questions saved to {output_path}")
            except Exception as e:
                logger.error(f"Error saving questions to file: {e}")
                return None
            
            return output_path
            
        except (OSError, IOError) as e:
            logger.error(f"Error saving questions file: {e}")
            return None
        
    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None
        
def process_document_questions(base_dir: str, deck_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Process all document directories in the given base directory to generate questions
    from the OCR JSON files.
    
    Args:
        base_dir (str): Base directory containing document folders with OCR results
        deck_name (Optional[str]): Name for the unified deck. If not provided, uses "Untitled Deck"
        
    Returns:
        Dict[str, Any]: Information about the generated questions and deck with the following structure:
            {
                "doc_dir1": [list of question file paths],
                "doc_dir2": [list of question file paths],
                "unified_deck": {
                    "deck_id": str,
                    "deck_name": str,
                    "deck_path": str,
                    "question_count": int,
                    "source_files": [list of source files]
                }
            }
    """
    results: Dict[str, Any] = {}
    all_questions: List[Dict[str, Any]] = []
    
    try:
        # Use default deck name if none provided
        if not deck_name:
            deck_name = "Untitled Deck"
            
        # Debug: Log the base directory we're processing
        logger.info(f"Processing document questions in base directory: {base_dir}")
        
        # Make sure base_dir exists
        if not os.path.exists(base_dir):
            logger.error(f"Base directory doesn't exist: {base_dir}")
            return results
            
        # Import utility function for directory creation
        from utils.file_operations import ensure_dir
        
        # Create output directory for questions
        questions_dir = os.path.join(base_dir, "questions")
        ensure_dir(questions_dir)
        
        # List all document directories
        doc_dirs = [d for d in os.listdir(base_dir) 
                   if os.path.isdir(os.path.join(base_dir, d)) and d != "questions"]

        # Log all available directories for debugging
        logger.info(f"Found {len(doc_dirs)} document directories to process for question generation: {doc_dirs}")
        
        # Recursively print the directory structure for debugging
        def print_dir_structure(path, indent=0):
            if not os.path.exists(path):
                logger.info(f"{'  ' * indent}Path doesn't exist: {path}")
                return
                
            items = os.listdir(path)
            for item in items:
                item_path = os.path.join(path, item)
                if os.path.isdir(item_path):
                    logger.info(f"{'  ' * indent}[DIR] {item}")
                    if indent < 2:  # Limit recursion depth
                        print_dir_structure(item_path, indent + 1)
                else:
                    logger.info(f"{'  ' * indent}[FILE] {item}")
        
        # Print the structure of the base directory to debug
        logger.info(f"Directory structure of {base_dir}:")
        print_dir_structure(base_dir)
        
        for doc_dir in doc_dirs:
            doc_path = os.path.join(base_dir, doc_dir)
            
            # Instead of just looking in specific directories, find all JSON files in the document directory
            # that might contain OCR results
            json_files = []
            found_json_paths = []
            
            # Import utility function for finding files
            from utils.file_operations import find_files
            
            # Find all JSON files in the document directory that match OCR result patterns
            try:
                # Use our utility function to find JSON files recursively
                found_json_paths = find_files(doc_path, "**/*{ocr,processed}*.json")
                
                # If no files found with specific patterns, try all JSON files
                if not found_json_paths:
                    found_json_paths = find_files(doc_path, "**/*.json")
                    
                # Extract filenames for logging
                json_files = [os.path.basename(path) for path in found_json_paths]
            except Exception as e:
                logger.error(f"Error searching for JSON files in {doc_path}: {e}")
                json_files = []
                found_json_paths = []
            
            if not found_json_paths:
                logger.warning(f"No OCR JSON files found for document {doc_dir}, skipping question generation")
                continue
                
            logger.info(f"Found {len(found_json_paths)} JSON files for document {doc_dir}: {json_files}")
            
            if not json_files:
                logger.warning(f"No JSON files found in OCR directory for document {doc_dir}")
                continue
                
            # Process each JSON file to generate questions
            doc_question_files = []
            doc_questions_dir = os.path.join(questions_dir, doc_dir)
            
            # Import utility function for directory creation
            from utils.file_operations import ensure_dir
            
            # Create output directory for document questions
            ensure_dir(doc_questions_dir)
            
            for json_path in found_json_paths:
                question_file = generate_questions_from_json(json_path, doc_questions_dir)
                
                if question_file:
                    doc_question_files.append(question_file)
                    
                    # Load the generated questions for the unified deck using improved error handling
                    try:
                        # Import our validation utility function
                        from utils.file_operations import merge_json_files
                        
                        try:
                            with open(question_file, 'r', encoding='utf-8') as f:
                                question_data = json.load(f)
                        except json.JSONDecodeError:
                            logger.error(f"Invalid JSON format in {question_file}, skipping file")
                            continue
                        except (IOError, PermissionError) as e:
                            logger.error(f"File access error for {question_file}: {e}")
                            continue
                            
                        # Check for placeholder content
                        if isinstance(question_data, dict) and "questions" in question_data:
                            questions_list = question_data["questions"]
                            if isinstance(questions_list, list) and len(questions_list) > 0:
                                # Check if it's just placeholder strings
                                if all(isinstance(q, str) for q in questions_list):
                                    logger.warning(f"Skipping file with placeholder strings: {question_file}")
                                    continue
                                # Valid questions found
                                all_questions.append(question_data)
                        elif isinstance(question_data, list):
                            # Direct list of questions
                            if len(question_data) > 0 and not all(isinstance(q, str) for q in question_data):
                                all_questions.append({"questions": question_data})
                            else:
                                logger.warning(f"Skipping file with invalid content: {question_file}")
                        else:
                            logger.warning(f"Unexpected format in {question_file}: {type(question_data)}")
                    except Exception as e:
                        logger.error(f"Error loading questions from {question_file}: {e}")
                    
            results[doc_dir] = doc_question_files
            logger.info(f"Generated {len(doc_question_files)} question files for document {doc_dir}")
        
        # Now create a unified deck with all questions
        try:
            # Import the deck manager module
            from .deck_manager import generate_unique_deck_id, create_unified_deck, save_deck_to_file
            
            # Generate a unique deck ID
            deck_id = generate_unique_deck_id()
            
            # Import the image utility functions and our file operations utilities
            try:
                from .image_utils import update_question_image_paths, copy_image_to_static
                from utils.file_operations import ensure_dir
                
                logger.info("Updating image paths to use static directory")
                processed_questions = []
                
                # First, make sure the static directories exist
                # Group images by deck ID using PathResolver
                if path_config:
                    if deck_id:
                        static_images_dir = os.path.join(path_config.images_dir, deck_id)
                        static_ocr_dir = os.path.join(path_config.images_dir, deck_id, "ocr_results")
                    else:
                        static_images_dir = path_config.images_dir
                        static_ocr_dir = os.path.join(path_config.images_dir, "ocr_results")
                else:
                    # Fallback to relative paths if PathResolver not available
                    if deck_id:
                        static_images_dir = f"./static/images/{deck_id}"
                        static_ocr_dir = f"./static/images/{deck_id}/ocr_results"
                    else:
                        static_images_dir = "./static/images"
                        static_ocr_dir = "./static/images/ocr_results"
                    
                ensure_dir(static_images_dir)
                ensure_dir(static_ocr_dir)
                
                # Find all OCR result directories and copy images to static
                ocr_images_copied = 0
                for doc_dir in os.listdir(base_dir):
                    doc_path = os.path.join(base_dir, doc_dir)
                    if os.path.isdir(doc_path):
                        ocr_results_dir = os.path.join(doc_path, "ocr_results")
                        if os.path.exists(ocr_results_dir) and os.path.isdir(ocr_results_dir):
                            logger.info(f"Found OCR results directory: {ocr_results_dir}")
                            for img_file in os.listdir(ocr_results_dir):
                                if img_file.endswith((".png", ".jpg", ".jpeg")):
                                    img_path = os.path.join(ocr_results_dir, img_file)
                                    target_path = os.path.join(static_ocr_dir, img_file)
                                    try:
                                        shutil.copy2(img_path, target_path)
                                        ocr_images_copied += 1
                                    except Exception as e:
                                        logger.error(f"Error copying OCR image: {e}")
                
                logger.info(f"Copied {ocr_images_copied} OCR result images to deck-specific folder: {static_ocr_dir}")
                
                # Process each question set with image path updates
                for q_set in all_questions:
                    try:
                        # Extract the questions list to pass to the update function
                        if isinstance(q_set, dict) and "questions" in q_set:
                            question_list = q_set["questions"]
                            # Update the image paths in the questions with deck-specific paths
                            updated_questions = update_question_image_paths(question_list, deck_id=deck_id)
                            # Create a new dictionary with the updated questions
                            updated_set = q_set.copy()
                            updated_set["questions"] = updated_questions
                            processed_questions.append(updated_set)
                        else:
                            # If format is unexpected, keep the original
                            logger.warning(f"Unexpected question set format, keeping original")
                            processed_questions.append(q_set)
                    except Exception as img_error:
                        # If update fails for a question set, keep the original
                        logger.error(f"Error updating image paths: {img_error}")
                        processed_questions.append(q_set)
                
                all_questions = processed_questions
                
                # Final verification of image paths
                path_issues = 0
                for q_set in all_questions:
                    if isinstance(q_set, dict) and "questions" in q_set:
                        for q in q_set["questions"]:
                            if isinstance(q, dict) and q.get("img_path"):
                                img_path = q.get("img_path")
                                if img_path and "to_process" in img_path:
                                    # Attempt to fix the path, using deck-specific folder if provided
                                    if path_config:
                                        if deck_id:
                                            fixed_path = img_path.replace("./to_process", os.path.join(path_config.images_dir, deck_id))
                                        else:
                                            fixed_path = img_path.replace("./to_process", path_config.images_dir)
                                    else:
                                        # Fallback to relative paths
                                        if deck_id:
                                            fixed_path = img_path.replace("./to_process", f"./static/images/{deck_id}")
                                        else:
                                            fixed_path = img_path.replace("./to_process", "./static/images")
                                    logger.info(f"Fixing image path: {img_path} -> {fixed_path}")
                                    q["img_path"] = fixed_path
                                    path_issues += 1
                
                if path_issues > 0:
                    logger.warning(f"Fixed {path_issues} remaining image paths still pointing to to_process")
                    
            except ImportError as e:
                logger.warning(f"Could not import image_utils module, image paths will not be updated: {e}")
            
            # Create a unified deck from all questions
            unified_deck = create_unified_deck(
                questions_list=all_questions,
                deck_name=deck_name,
                deck_id=deck_id
            )
            
            # Find the absolute path to the project root (two levels up from this file)
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            decks_dir = os.path.join(project_root, "decks")
            
            # Save the deck to the absolute decks directory
            deck_path = save_deck_to_file(unified_deck, decks_dir=decks_dir)
            
            # Add the unified deck info to the results
            results["unified_deck"] = {
                "deck_id": deck_id,
                "deck_name": deck_name,
                "deck_path": deck_path,
                "question_count": unified_deck["metadata"]["question_count"]
            }
            
            logger.info(f"Created unified deck '{deck_name}' with ID {deck_id} containing {unified_deck['metadata']['question_count']} questions")
            
        except Exception as e:
            logger.error(f"Error creating unified deck: {e}")
            results["error"] = str(e)
        
        return results
        
    except Exception as e:
        logger.error(f"Error processing documents for question generation: {e}")
        return results