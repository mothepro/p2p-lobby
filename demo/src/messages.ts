import {Packer} from '../..'

/** Generate a random number [int or float] that matches all the other peer's number. */
export class RandomRequest {
    constructor(public isInt: boolean) {}

    static pack<U>(inst: RandomRequest) { return inst.isInt }
    static unpack<U>(isInt: boolean) { return new RandomRequest(isInt) }
}

Packer(RandomRequest)
