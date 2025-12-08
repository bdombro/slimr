import {
	getType as _getType,
	isAnyObject as _isAnyObject,
	isArray as _isArray,
	isBlob as _isBlob,
	isBoolean as _isBoolean,
	isDate as _isDate,
	isEmptyArray as _isEmptyArray,
	isEmptyObject as _isEmptyObject,
	isEmptyString as _isEmptyString,
	isError as _isError,
	isFile as _isFile,
	isFullArray as _isFullArray,
	isFullObject as _isFullObject,
	isFullString as _isFullString,
	isFunction as _isFunction,
	isMap as _isMap,
	isNaNValue as _isNaNValue,
	isNegativeNumber as _isNegativeNumber,
	isNull as _isNull,
	isNullOrUndefined as _isNullOrUndefined,
	isNumber as _isNumber,
	isObject as _isObject,
	isObjectLike as _isObjectLike,
	isOneOf as _isOneOf,
	isPlainObject as _isPlainObject,
	isPositiveNumber as _isPositiveNumber,
	isPrimitive as _isPrimitive,
	isPromise as _isPromise,
	isRegExp as _isRegExp,
	isSet as _isSet,
	isString as _isString,
	isSymbol as _isSymbol,
	isType as _isType,
	isUndefined as _isUndefined,
	isWeakMap as _isWeakMap,
	isWeakSet as _isWeakSet,
} from "@slimr/util"

declare global {
	var getType: typeof _getType
	var isAnyObject: typeof _isAnyObject
	var isArray: typeof _isArray
	var isBlob: typeof _isBlob
	var isBoolean: typeof _isBoolean
	var isDate: typeof _isDate
	var isEmptyArray: typeof _isEmptyArray
	var isEmptyObject: typeof _isEmptyObject
	var isEmptyString: typeof _isEmptyString
	var isError: typeof _isError
	var isFile: typeof _isFile
	var isFullArray: typeof _isFullArray
	var isFullObject: typeof _isFullObject
	var isFullString: typeof _isFullString
	var isFunction: typeof _isFunction
	var isMap: typeof _isMap
	var isNaNValue: typeof _isNaNValue
	var isNegativeNumber: typeof _isNegativeNumber
	var isNull: typeof _isNull
	var isNullOrUndefined: typeof _isNullOrUndefined
	var isNumber: typeof _isNumber
	var isObject: typeof _isObject
	var isObjectLike: typeof _isObjectLike
	var isOneOf: typeof _isOneOf
	var isPlainObject: typeof _isPlainObject
	var isPositiveNumber: typeof _isPositiveNumber
	var isPrimitive: typeof _isPrimitive
	var isPromise: typeof _isPromise
	var isRegExp: typeof _isRegExp
	var isSet: typeof _isSet
	var isString: typeof _isString
	var isSymbol: typeof _isSymbol
	var isType: typeof _isType
	var isUndefined: typeof _isUndefined
	var isWeakMap: typeof _isWeakMap
	var isWeakSet: typeof _isWeakSet
}

globalThis.getType = _getType
globalThis.isAnyObject = _isAnyObject
globalThis.isArray = _isArray
globalThis.isBlob = _isBlob
globalThis.isBoolean = _isBoolean
globalThis.isDate = _isDate
globalThis.isEmptyArray = _isEmptyArray
globalThis.isEmptyObject = _isEmptyObject
globalThis.isEmptyString = _isEmptyString
globalThis.isError = _isError
globalThis.isFile = _isFile
globalThis.isFullArray = _isFullArray
globalThis.isFullObject = _isFullObject
globalThis.isFullString = _isFullString
globalThis.isFunction = _isFunction
globalThis.isMap = _isMap
globalThis.isNaNValue = _isNaNValue
globalThis.isNegativeNumber = _isNegativeNumber
globalThis.isNull = _isNull
globalThis.isNullOrUndefined = _isNullOrUndefined
globalThis.isNumber = _isNumber
globalThis.isObject = _isObject
globalThis.isObjectLike = _isObjectLike
globalThis.isOneOf = _isOneOf
globalThis.isPlainObject = _isPlainObject
globalThis.isPositiveNumber = _isPositiveNumber
globalThis.isPrimitive = _isPrimitive
globalThis.isPromise = _isPromise
globalThis.isRegExp = _isRegExp
globalThis.isSet = _isSet
globalThis.isString = _isString
globalThis.isSymbol = _isSymbol
globalThis.isType = _isType
globalThis.isUndefined = _isUndefined
globalThis.isWeakMap = _isWeakMap
globalThis.isWeakSet = _isWeakSet
