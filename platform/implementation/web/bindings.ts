export interface IMPORT_MODULE_OBJECT {
  [key: string]: { [key: string]: Function }
} // IMPORT_MODULE_OBJECT

const _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING : { [key: string]: readonly string[] }= Object.freeze({
}); // _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING

export interface EXPORT_METHODS {
  [key: string]: Function  /**
   * @returns                                i32
   */
  entryFunction(): number;
} // EXPORT_METHODS 


export interface ApplicationInterface {
    methods: EXPORT_METHODS
    memory : {
        wasmMemory : WebAssembly.Memory
        views      : {
            u8  : Uint8Array
            u16 : Uint16Array
            u32 : Uint32Array
            u64 : BigUint64Array

            i8  : Int8Array
            i16 : Int16Array
            i32 : Int32Array
            i64 : BigInt64Array

            f32 : Float32Array
            f64 : Float64Array

            generic : DataView<ArrayBufferLike>
        }
        ensureViews() : void
        isValidPoitner(pointer: number) : boolean
    }
};

export class Application implements ApplicationInterface {
    static async createApplication(wasmFilePath: string, importObject: IMPORT_MODULE_OBJECT) {
        const wasmImports : Record<string, Record<string, Function>> = {};
        for (let moduleName in _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING) {
            const sourceModule = importObject[moduleName]!;
            if (!sourceModule) { throw Error(`Missing module: '${moduleName}' from 'importObject' argument`); }

            wasmImports[moduleName] = {};
            const moduleFunctionNameArray = _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING[moduleName]!;
            if (!moduleFunctionNameArray) { throw Error(`Missing function mapping for module: '${moduleName}'`); }
            for (let functionName of moduleFunctionNameArray) {
                if (!sourceModule[functionName]) {throw Error(`Missing function: '${functionName}' from module: '${moduleName}'`); }
                wasmImports[moduleName][functionName] = sourceModule[functionName]!.bind(sourceModule);
            }
        }
        const wasmSource = await WebAssembly.instantiateStreaming(fetch(wasmFilePath), wasmImports);
        return new Application(wasmSource);
    }

    private constructor(wasmSource: WebAssembly.WebAssemblyInstantiatedSource) {
        this.wasmSource = wasmSource;
        this.mapExportedMethods();
        this.initializeMemoryObject();
   }

   private mapExportedMethods() {
       const exports = this.wasmSource.instance.exports;
       for (let exportMethodName in this.methods) {
           const exportedMethod = exports[exportMethodName] as Function
           if (!exportedMethod) { throw Error(`Missing exported function: '${exportMethodName}' in wasm source`) };
           this.methods[exportMethodName] = exportedMethod;
       }
   }

   private initializeMemoryObject() {
       const exports = this.wasmSource.instance.exports;
       const wasmMemory = exports.memory as WebAssembly.Memory;
       if (!wasmMemory || !wasmMemory.buffer.byteLength) { throw Error(`Missing 'memory' export in wasm source`); }

       const createViews = (buffer: ArrayBufferLike): ApplicationInterface["memory"]["views"] => {
           return {
               u8  : new Uint8Array(buffer),
               u16 : new Uint16Array(buffer),
               u32 : new Uint32Array(buffer),
               u64 : new BigUint64Array(buffer),

               i8  : new Int8Array(buffer),
               i16 : new Int16Array(buffer),
               i32 : new Int32Array(buffer),
               i64 : new BigInt64Array(buffer),

               f32 : new Float32Array(buffer),
               f64 : new Float64Array(buffer),

               generic : new DataView<ArrayBufferLike>(buffer),
           }
       };

       this.memory = {
           "wasmMemory": wasmMemory,
           "views" : createViews(wasmMemory.buffer),
           "ensureViews" : () => {
               if (this.memory.views.generic.buffer.byteLength === 0) {
                   this.memory.views = createViews(this.memory.wasmMemory.buffer)
               }
           },
           "isValidPoitner" : (pointer: number) : boolean => {
               return !(pointer < 0 || pointer >= this.memory.wasmMemory.buffer.byteLength || pointer != Math.floor(pointer));
           }
       };
   }

    private wasmSource: WebAssembly.WebAssemblyInstantiatedSource;
            methods  = {} as ApplicationInterface["methods"]
            memory   = {} as ApplicationInterface["memory"]
};
