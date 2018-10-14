import {Codec, createCodec, decode, encode} from 'msgpack-lite'
import {Buffer} from 'buffer'

type Constructor<Instance, params extends Array<any> = any[]> = { new(...args: params): Instance }

type buffer = Buffer | Uint8Array

type primitive = null | undefined | boolean | number | string
    | primitiveSet | primitiveArray
    | primitiveMap | primitiveObj
interface primitiveObj { [name: string]: primitive }
interface primitiveArray extends Array<primitive> {}
interface primitiveSet extends Set<primitive> {}
interface primitiveMap extends Map<primitive, primitive> {}

/** Implement this then be sure to register it! */
export interface Packable<T> extends Constructor<T> {
    // static pack(inst: instance): packed   // not supported yet
    // static unpack(pack: packed): instance // not supported yet
}

/** Pack raw data to a buffer. */
export const pack = (data: any) => encode(data, {codec}) as buffer

/** Unpack a buffer to raw data. */
export const unpack = (buffer: buffer) => decode(buffer, {codec}) as any

/** Register a class to be packed or unpacked to a buffer when attempted to be sent or received. */
export default function register<T, V>(clazz: Constructor<T>, packer: (inst: T) => V, unpacker: (buff: V) => T): void
export default function register<T extends Error, V>(clazz: Constructor<T>): void
export default function register<T extends Packable<T>, V>(clazz: Packable<T>): void
export default function register<T, V>(
    clazz: Constructor<T>,
    packer?: (inst: T) => V,
    unpacker?: (buff: V) => T,
) {
    if (code > 127)
        throw new Error('A max of 128 types can be registered for packing.')

    // Get packers from the static method in the class
    if(typeof (clazz as any).pack == 'function')
        packer = (clazz as any).pack

    if(typeof (clazz as any).unpack == 'function')
        unpacker = (clazz as any).unpack

    // 'any' casts are needed because Errors are not enumerable by default
    if (clazz as any === Error || Error.isPrototypeOf(clazz)) {
        packer = err => ({
            ...err as any,
            message: (err as any).message
        })

        unpacker = data => {
            const error = new clazz((data as any).message)

            for (const [key, value] of Object.entries(data))
                (error as any)[key] = value

            return error
        }
    }

    // These 'any' casts are used because the typed definitions for this package are incorrect
    codec.addExtPacker(code, clazz, [packer, (x: any) => encode(x, {codec})] as any)
    codec.addExtUnpacker(code++, [(x: any) => decode(x, {codec}), unpacker] as any)
}

const codec: Codec = createCodec({preset: true})
let code: number

// Override Errors
code = 0x0E
register(Error)
code = 0x01
register(EvalError)
register(RangeError)
register(ReferenceError)
register(SyntaxError)
register(TypeError)
register(URIError)

// Override general types
code = 0x1C
register(
    Map as Constructor<Map<primitive, any>>,
    map => [...map],
    entries => new Map(entries as [primitive, primitive][])
)
code = 0x07
register(
    Set as Constructor<Set<primitive>>,
    set => [...set],
    entries => new Set(entries as primitive[])
)

code = 0x1E // after reserved section