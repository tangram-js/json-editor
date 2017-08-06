import $RefParser from 'json-schema-ref-parser'
import repository from './schemas'

// static resolver for json-schema-ref-parser
var defaultResolver = {
  order: 1,
  canRead: /^default:/i,
  read: async (file) => {
    let schemaName = file.url.substr(10)
    return await retrieveSchema(schemaName, false)
  }
}

// hash of resolvers
var resolvers = { default: defaultResolver }

// retrieve json schema from schema repository by name
function retrieveSchema (schemaName, dereference) {
  return new Promise((resolve, reject) => {
    let schemaData = repository[schemaName]
    if (schemaData) {
      if (dereference || typeof dereference === 'undefined') {
        $RefParser.bundle(schemaData, { resolve: resolvers })
          .then(schema => {
            resolve(schema)
          })
          .catch(error => {
            console.log(error)
            resolve(schemaData)
          })
      } else {
        resolve(schemaData)
      }
    } else {
      resolve(null)
    }
  })
}

// retrieve all schema types from schema repository
function retrieveTypes () {
  return Object.keys(repository)
}

export default {
  defaultResolver,
  resolvers,
  retrieveSchema,
  retrieveTypes
}
