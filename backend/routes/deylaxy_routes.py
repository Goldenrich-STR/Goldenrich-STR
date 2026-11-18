import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from services.deylaxy_service import MAX_BODY, authenticate, decode_message, deliver

router = APIRouter(prefix='/deylaxy', tags=['Deylaxy'])
logger = logging.getLogger(__name__)


async def get_db():
    from server import db_instance
    return db_instance


@router.post('/posts')
async def deylaxy_posts(request: Request, db=Depends(get_db)):
    try:
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > MAX_BODY:
                raise HTTPException(413, 'Webhook body exceeds 1 MiB')
        raw = bytes(body)
        authenticate(request.headers, raw)
        message = decode_message(raw)
        code, reply = await deliver(db, message, request.headers, raw)
        return JSONResponse(reply, status_code=code)
    except HTTPException as exc:
        return JSONResponse({'error': exc.detail}, status_code=exc.status_code)
    except Exception:
        logger.exception('Deylaxy blog delivery failed')
        return JSONResponse({'error': 'could not save the post'}, status_code=500)
