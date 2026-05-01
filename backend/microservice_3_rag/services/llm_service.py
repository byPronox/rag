from groq import Groq
from config.settings import settings

client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

def generate_rag_response(system_prompt: str, llm_model: str, context_products: list, chat_history: list, user_message: str, groq_api_key: str):
    
    # Validamos que el admin haya guardado la llave
    if not groq_api_key:
        return "ERROR: El administrador del sistema no ha configurado la Master API Key de Groq."

    # Iniciamos el cliente con la llave de la base de datos
    client = Groq(api_key=groq_api_key)

    context_text = "AVAILABLE CATALOG:\n"
    if not context_products:
        context_text += "No products match the search.\n"
    else:
        for p in context_products:
            context_text += f"- {p['name']} (SKU: {p['sku']}) | Price: ${p['price']} | Stock: {p['stock']}\n"
    
    messages = [
        {"role": "system", "content": f"{system_prompt}\n\nCONTEXT:\n{context_text}"}
    ]
    
    for role, msg in chat_history:
        messages.append({"role": role, "content": msg})
        
    messages.append({"role": "user", "content": user_message})

    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model=llm_model,
            temperature=0.2,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Error communicating with LLM: {str(e)}"