"""Экспорт OpenAPI-схемы для генерации TS-типов фронтенда (make types)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

if __name__ == "__main__":
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("openapi.json")
    output.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2))
    print(f"OpenAPI schema -> {output}")
