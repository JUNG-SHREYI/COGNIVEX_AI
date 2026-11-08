import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


def main() -> None:
    load_dotenv(Path(__file__).resolve().parent / ".env")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit(
            "GEMINI_API_KEY is not set. Copy .env.example to .env and add your "
            "Gemini API key."
        )

    client = genai.Client(api_key=api_key)

    print("\n===== DSA AI TUTOR =====")
    student_question = input("\nWhat would you like to learn today? ").strip()
    if not student_question:
        raise SystemExit("Please enter a question to get started.")

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=(
            "You are a friendly Data Structures and Algorithms tutor. "
            "Explain concepts in simple language with examples and analogies.\n\n"
            f"Student question: {student_question}"
        ),
    )

    print("\n===== DSA AI TUTOR RESPONSE =====\n")
    print(response.text or "The model returned no text.")

    print("\n===== API USAGE INFORMATION =====")
    usage = response.usage_metadata
    if usage:
        print("Input tokens:", usage.prompt_token_count)
        print("Output tokens:", usage.candidates_token_count)
        print("Total tokens:", usage.total_token_count)
    else:
        print("Usage information not available.")


if __name__ == "__main__":
    main()
