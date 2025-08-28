# Recall
Recall is an app built for students to improve their learning process by using flashcards to memorize their notes. The basic crust of Recall is:

“Upload your notes to Recall and have it auto-generate high-quality flashcards for you automatically using AI”

The key features of Recall include:
1.	Smart AI powered flash card generation
2.	Robust support for all types of PDFs (scanned, handwritten, text)
3.	Handles Latex and mathematical equations
4.	Generates high-quality questions
5.	Does not hallucinate; uses your PDF to generate cards.

# Goals
*	**Smart, Local-First Study Assistant**
    * Runs primarily on the desktop (Qt/Python).
    * Emphasis on privacy, offline-first workflow, and performance.
*	**Optimized for Heavy Study Domains**
    * Especially useful for subjects with dense material or repetition (medicine, law, STEM, languages).
    * Handles scanned notes and math-heavy content gracefully.
*	**Rich Flashcard Generation**
    * Beyond simple Q&A: supports cloze deletions, true/false, multiple-choice, and timed recall cards.
    * Cards tailored to the content and keywords, not generic.
*   **Structured Output, Not Freeform**
    * Everything is formatted into study-ready decks.
    * Focus on active recall and spaced repetition, not chatty AI responses.
*	**Quality Questions**
    * Produces quality cards instead of shallow questions.

# Non-Goals
*	Chatbot functionality – we won’t provide freeform Q&A or conversational tutoring.
*	Note-taking features – Not replacing Obsidian, Notion, or OneNote.
*	General PDF reader – We’re not aiming to be a reading interface.
*	Plain Anki clone – No manual flashcard creation as the core workflow.
*	Broad AI assistant – Focused only on study material: flashcards, not on scheduling, writing help, etc.
