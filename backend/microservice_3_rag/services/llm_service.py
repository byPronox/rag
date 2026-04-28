from groq import Groq
from config.settings import settings

client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

def generate_rag_response(system_prompt: str, llm_model: str, context_products: list, chat_history: list, user_message: str):
    if not client:
        return "ERROR: Groq API Key is missing in backend configuration."

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
        
    # 4. Mensaje actual
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