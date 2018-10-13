import 'mocha'
import 'should'
import {Buffer} from 'buffer'
import register, {pack, unpack} from '../src/Packer'

describe('Packer', () => {
    it('Complex', () => {
        const data = {
            'int': 1,
            'float': 0.5,
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
        actual!.should.eql(data)
    })

    it('Register', () => {
        class Point {
            constructor(
                public x: number,
                public y: number) {}
        }
        class Data {
            constructor(
                public name: string,
                public points: Point[],
                public stuff: Map<string, any> = new Map) {}
        }

        register(Point,
                point => [point.x, point.y],
                buff => new Point(buff[0], buff[1]))
        register(Data,
                data => [data.name, data.points, data.stuff] as [string, Point[], Map<string, any>],
                buff => new Data(buff[0], buff[1], buff[2]))

        const data = new Data('pootis', [
            new Point(0, 0),
            new Point(-1, 1),
        ], new Map([['yes', 'no']]))


        const actual: Data = unpack(pack(data))

        actual.should.be.instanceOf(Data)
        actual.should.eql(data)
    })

    it('Errors', () => {
        class PootError extends Error {}
        register(PootError)

        const error = new PootError('pootis') as any
        error.columnNumber = 6
        error.more = true
        error.type = 'extra'

        const actual = unpack(pack(error))

        actual.should.be.an.Error()
        actual.should.eql(error)
    })
})