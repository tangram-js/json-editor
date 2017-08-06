export var defaultSchema = {
  title: 'sample-order',
  type: 'object',
  'properties': {
    'orderNo': { 'type': 'string', 'pattern': '^O[0-9]{4,}$' },
    'orderDate': { 'type': 'string', 'format': 'date-time' },
    'customer': {
      'type': 'object',
      'title': 'sample-customer',
      'properties': {
        'customerNo': { 'type': 'string', 'pattern': '^C[0-9]{4,}$', 'default': 'C0001' },
        'firstName': { 'type': 'string' },
        'lastName': { 'type': 'string' },
        'age': { 'type': 'integer', 'minimum': 1 },
        'birthday': { 'type': 'string', 'format': 'date-time' }
      },
      'required': ['customerNo', 'firstName', 'lastName']
    },
    'orderItems': {
      'type': 'array',
      'items': {
        'type': 'object',
        'title': 'sample-orderItem',
        'properties': {
          'productNo': { 'type': 'string', 'pattern': '^P[0-9]{3,}$' },
          'quantity': { 'type': 'integer', 'minimum': 1 },
          'unitPrice': { 'type': 'integer', 'minimum': 1 },
          'subtotal': { 'type': 'integer', 'minimum': 1 }
        },
        'required': ['productNo', 'quantity', 'unitPrice']
      },
      'additionalItems': false
    },
    'shippingAddr': {
      'type': 'object',
      'title': 'sample-address',
      'properties': {
        'street': { 'type': 'string' },
        'county': { 'type': 'string' },
        'city': { 'type': 'string' },
        'country': { 'type': 'string' },
        'zip': { 'type': 'string', 'pattern': '^[0-9]{3,}$' }
      },
      'required': ['street', 'city', 'country', 'zip'],
      'additionalProperties': false
    },
    'total': { 'type': 'integer', 'minimum': 1 },
    'testList': {
      'enum': [ 'first', 12, true, { 'p1': 'v1', 'p2': 10 } ]
    }
  },
  'required': ['orderNo', 'orderDate', 'customer', 'orderItems', 'shippingAddr', 'total']
}

export var defaultValue = {
  'orderNo': 'O1234',
  'orderDate': '2016-12-29T00:00:00Z',
  'customer': {
    'customerNo': 'C0001',
    'firstName': 'James',
    'lastName': 'Huang',
    'age': 51,
    'birthday': '1966-08-01T00:00:00Z'
  },
  'orderItems': [
    {
      'productNo': 'P001',
      'quantity': 5,
      'unitPrice': 10,
      'subtotal': 50
    },
    {
      'productNo': 'P002',
      'quantity': 10,
      'unitPrice': 20,
      'subtotal': 200
    },
    {
      'productNo': 'P003',
      'quantity': 2,
      'unitPrice': 100,
      'subtotal': 200
    }
  ],
  'shippingAddr': {
    'street': 'No. 323 ChungSan Rd.',
    'county': 'ChungHe',
    'city': 'New Taipei',
    'country': 'Taiwan',
    'zip': '201'
  },
  'total': 450
}
