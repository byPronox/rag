{
    'name': 'RAG Sync',
    'version': '1.1',
    'category': 'Integration',
    'summary': 'Multi-tenant synchronization of product variants to RabbitMQ for RAG AI',
    'depends': ['base', 'product', 'website_sale'],
    'data': [
        'views/res_config_settings_views.xml',
        'views/product_views.xml',
    ],
    'installable': True,
    'application': False,
    'external_dependencies': {
        'python': ['pika'],
    },
}