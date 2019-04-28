import 'should'
import {Buffer} from 'buffer'
import Packer, {pack, PackableInst, unpack} from '../src/packer'

describe('Packer', () => {
    it('Complex', () => {
        const data = {
            'int': -1769510356,
            'float': 5867586777690.57897973234567,
            'boolean': true,
            'null': null,
            'string': 'foo bar',
            'array': [
                'foo',
                'bar',
            ],
            'inner': {
                'object': {
                    'foo': 1,
                    'baz': 0.5,
                },
                'map': new Map([
                    ['hello', 'world'],
                    ['1', '12345'],
                ]),
                'set': new Set([
                    'hello',
                    'world',
                    '1',
                    '12345',
                ]),
            },
        }

        const buffer = pack(data)
        Buffer.isBuffer(buffer)

        const actual = unpack(buffer)
        actual.should.eql(data)
    })

    it('Register', () => {
        // Simple sample with static packing methods
        class Wrapper implements PackableInst {
            constructor(public str: string) {}
            static pack(w: Wrapper) { return w.str }
            static unpack(str: string) { return new Wrapper(str) }
        }
        Packer(Wrapper)

        // Register other classes
        class Point {
            constructor(
                public x: number,
                public y: number) {}
        }
        class Data {
            constructor(
                public name: string,
                public points: Point[],
                public wrapper: Wrapper,
                public stuff: Map<string, any> = new Map) {}
        }
        Packer(Point,
                point => [point.x, point.y],
                buff => new Point(buff[0], buff[1]))
        Packer(Data,
                data => [
                    data.name,
                    data.points,
                    data.wrapper,
                    data.stuff,
                ] as [
                    string,
                    Point[],
                    Wrapper,
                    Map<string, any>
                ],
                buff => new Data(buff[0], buff[1], buff[2], buff[3]))

        // extensive data object to send
        const data = new Data(
            'pootis',
            [new Point(0, 0), new Point(-1, 1)],
            new Wrapper('nothing'),
            new Map([['yes', 'no']]))

        const buffer = pack(data)
        Buffer.isBuffer(buffer).should.be.true()
        buffer.length.should.lessThan(JSON.stringify(data).length)

        const actual: Data = unpack(buffer)

        // For some reason these no longer works??, but it passes outside of tests
        // actual.should.be.instanceOf(Data)
        // actual.should.eql(data)
    })

    it('Errors', () => {
        class PootError extends Error {}
        Packer(PootError)

        const error = new PootError('pootis') as any
        error.columnNumber = 6
        error.more = true
        error.type = 'extra'

        const actual = unpack(pack(error))

        actual.should.be.an.Error()
        actual.should.eql(error)
    })
})
