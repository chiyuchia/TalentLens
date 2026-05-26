from pathlib import Path


def extract_pdf_text(pdf_path: str | Path) -> str:
    import fitz

    path = Path(pdf_path)
    with fitz.open(path) as document:
        pages = [page.get_text("text") for page in document]
    return clean_resume_text("\n".join(pages))


def clean_resume_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)
