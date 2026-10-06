FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt* ./
RUN --mount=type=cache,target=/root/.cache/pip \
  if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
COPY --link . .

CMD ["python", "./script.py"]
