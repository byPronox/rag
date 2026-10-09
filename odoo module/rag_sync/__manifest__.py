{
    'name': 'RAG Sync',
    'version': '1.2',
    'category': 'Integration',
    'summary': 'Multi-tenant synchronization of product variants to RabbitMQ for RAG AI',
    'depends': ['base', 'product', 'stock', 'website_sale', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'data/ir_cron.xml',
        'views/product_views.xml',
        'views/res_config_settings_views.xml',
        'views/rag_outbox_views.xml',
    ],
    'installable': True,
    'application': False,
    'external_dependencies': {
        'python': ['pika'],
    },
}