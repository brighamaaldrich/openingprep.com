# Use an official Python 3.11 runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Add Pre-Downloaded Stockfish (Corrected) ---

# 1. Copy BOTH binaries from your "server" directory into a temporary location inside the image.
COPY stockfish_amd64 /tmp/stockfish_amd64
COPY stockfish_arm64 /tmp/stockfish_arm64

# 2. Now that the files are inside the container, run the logic to select the right one.
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "amd64" ]; then \
        cp /tmp/stockfish_amd64 /usr/local/bin/stockfish; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        cp /tmp/stockfish_arm64 /usr/local/bin/stockfish; \
    fi

# 3. Make the final binary executable.
RUN chmod +x /usr/local/bin/stockfish

# 4. (Optional but good practice) Clean up the temporary files.
RUN rm /tmp/stockfish_amd64 /tmp/stockfish_arm64

# Copy the rest of your application code
COPY . .

# Command to run your FastAPI server when the container starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]