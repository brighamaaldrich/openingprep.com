FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY stockfish_amd64 /tmp/stockfish_amd64
COPY stockfish_arm64 /tmp/stockfish_arm64

ARG TARGETARCH
RUN if [ "$TARGETARCH" = "amd64" ]; then \
        cp /tmp/stockfish_amd64 /usr/local/bin/stockfish; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        cp /tmp/stockfish_arm64 /usr/local/bin/stockfish; \
    fi

RUN chmod +x /usr/local/bin/stockfish

RUN rm /tmp/stockfish_amd64 /tmp/stockfish_arm64

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]