import schemaArray from './array.json'
import schemaBoolean from './boolean.json'
import schemaInteger from './integer.json'
import schemaNumber from './number.json'
import schemaObject from './object.json'
import schemaString from './string.json'
import jsonSchema from './json_schema.json'
import sampleOrder from './sample_order.json'

export default {
  'string': schemaString,
  'integer': schemaInteger,
  'number': schemaNumber,
  'boolean': schemaBoolean,
  'object': schemaObject,
  'array': schemaArray,
  'json_schema': jsonSchema,
  'sample_order': sampleOrder
}
