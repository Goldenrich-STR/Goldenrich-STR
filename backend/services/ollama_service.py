import os
import httpx
import logging
from typing import List, Dict, Any, AsyncGenerator

logger = logging.getLogger(__name__)

class OllamaService:
    """Service to communicate with a local self-hosted Ollama instance."""

    @staticmethod
    async def chat(
        messages: List[Dict[str, str]],
        stream: bool = False
    ) -> Any:
        """Send chat history and prompt to Ollama.
        
        Args:
            messages: List of message dictionaries containing 'role' and 'content'.
            stream: Whether to stream the response back.
            
        Returns:
            Ollama response JSON (dict) if stream=False, or an async generator yielding chunked strings if stream=True.
        """
        url = os.environ.get("OLLAMA_API_URL", "http://localhost:11434/api/chat").strip()
        model = os.environ.get("OLLAMA_MODEL", "qwen3:8b").strip()
        try:
            timeout_val = float(os.environ.get("OLLAMA_TIMEOUT", "30").strip())
        except ValueError:
            timeout_val = 30.0

        payload = {
            "model": model,
            "messages": messages,
            "stream": stream
        }

        logger.info(f"Requesting Ollama: url={url}, model={model}, stream={stream}")

        if stream:
            async def event_generator() -> AsyncGenerator[str, None]:
                try:
                    async with httpx.AsyncClient(timeout=timeout_val) as client:
                        async with client.stream("POST", url, json=payload) as response:
                            response.raise_for_status()
                            async for chunk in response.aiter_lines():
                                if chunk.strip():
                                    yield chunk + "\n"
                except httpx.HTTPStatusError as e:
                    logger.error(f"Ollama stream HTTP status error: {e}")
                    yield '{"error": "Ollama service returned an error status."}\n'
                except httpx.RequestError as e:
                    logger.error(f"Ollama stream connection or timeout error: {e}")
                    yield '{"error": "Failed to connect to local Ollama service. Please ensure Ollama is running."}\n'
                except Exception as e:
                    logger.error(f"Ollama stream unexpected error: {e}")
                    yield '{"error": "An unexpected error occurred."}\n'
            return event_generator()
        else:
            try:
                async with httpx.AsyncClient(timeout=timeout_val) as client:
                    response = await client.post(url, json=payload)
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Ollama HTTP status error: {e}")
                return {"error": "Ollama service returned an error status."}
            except httpx.RequestError as e:
                logger.error(f"Ollama connection or timeout error: {e}")
                return {"error": "Failed to connect to local Ollama service. Please ensure Ollama is running."}
            except Exception as e:
                logger.error(f"Ollama unexpected error: {e}")
                return {"error": f"An unexpected error occurred: {str(e)}"}
