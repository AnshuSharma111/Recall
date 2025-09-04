Whenever a bad request is sent to the server, it raises an HTTPException and returns a http status error code and accompanying detail.
Varying types of errors are grouped under one HTTP code, such as both invalid file name and invalid file extension come under 400 - Bad Request
Therefore to make the error debugging process easier on myself, I've included a internal error code in every response to identify exactly what the error is and what is causing it.

A regular response to bad request will therefore look like:
{
    status_code=status. HTTP Code,
    detail={
        "code": Internal Code,
        "message": "Erro Detail",
        "source": "What's causing it"
    }
}

Here the codes used for different cases:

1) 10
No files uploaded
2) 11
Invalid File Name
2) 12
Invalid File Type
3) 13
Internal Error Saving Uploaded Files
4) 14
Internal Error PDF to IMG module Loading
5) 15
Error Copying IMG file
6) 16
Error during image chunking
7) 17
Internal Error Chunking mosule loading