from groq import Groq

def generate_rag_response(supreme_prompt: str, tenant_prompt: str, llm_model: str, context_products: list, chat_history: list, user_message: str, groq_api_key: str):
    
    if not groq_api_key:
        return "ERROR: El administrador del sistema no ha configurado la Master API Key de Groq.", 0

    client = Groq(api_key=groq_api_key)

    # Armamos el texto del catálogo
    context_text = "AVAILABLE CATALOG:\n"
    if not context_products:
        context_text += "No products match the search.\n"
    else:
        for p in context_products:
            context_text += f"- {p['name']} (SKU: {p['sku']}) | Price: ${p['price']} | Stock: {p['stock']}\n"
    
    full_system_content = f"{supreme_prompt}\n\n[STORE OWNER INSTRUCTIONS]:\n{tenant_prompt}\n\n{context_text}"
    
    messages = [
        {"role": "system", "content": full_system_content}
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
        reply = chat_completion.choices[0].message.content
        tokens = chat_completion.usage.total_tokens
        return reply, tokens
    except Exception as e:
        return f"Error communicating with LLM: {str(e)}", 0