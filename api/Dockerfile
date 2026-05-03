FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir uv && uv pip install --system -r <(python - <<'PY'
import tomllib
with open('pyproject.toml','rb') as f:
 d=tomllib.load(f)
print('\n'.join(d['project']['dependencies']))
PY
)
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
