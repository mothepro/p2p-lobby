import Errors, { buildError } from '../config/errors'
import { status, ConnectionStatus } from '../config/constants'

/**
 * Multiply with carry PRNG
 * https://en.wikipedia.org/wiki/Multiply-with-carry_pseudorandom_number_generator
 */

let x: number,
    y: number

/** Seeds the RNG. Must be called before RNG. */
export function seedInt(seed: number) {
    x = seed
    y = 987654321 // Must be reset
}

/** Generates a random signed integer. */
export function nextInt() {
    y = (36969 * (y & 0xFFFF) + (y >> 16)) & 0xFFFFFFFF
    x = (18000 * (x & 0xFFFF) + (x >> 16)) & 0xFFFFFFFF
    return ((y << 16) + x) & 0xFFFFFFFF
}

/** Seeds with a number in [0,1) and allows proper distribution. */
export function seedFloat(seed: number) {
    seedInt(Math.floor(seed * 0xFFFFFFFF))
}

/** Generates a random number [0,1). */
export function nextFloat() {
    return 0.5 + nextInt() / 2 ** 32
}

/**
 * Generates a random number in [0,1). Same as Math.random()
 * If `isInt` is true, than a integer in range [-2 ** 31, 2 ** 31) is generated.
 */
export default function(isInt = false) {
    if (status == ConnectionStatus.IN_ROOM)
        return isInt ? nextInt() : nextFloat()
    
    throw buildError(Errors.ROOM_NOT_READY, { reason: 'Generating random number' })
}
