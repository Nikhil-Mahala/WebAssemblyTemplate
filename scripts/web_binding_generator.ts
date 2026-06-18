// NOTE: Use this code with caution
// As:
// - This code is part of hobby project
// - This code is not supposed to follow certain rules (so please do not expect it as general purpose C parser or binidng generator)
// - This code uses heavy hardcoded assumptions to make it work
// - This code does not follow most efficient techniques, it is supposed to get work done

const C_BASE_TO_TS_BASE_MAPPING : Record<string, string> = Object.freeze({
    "u8"  : "number",
    "u16" : "number",
    "u32" : "number",
    "u64" : "bigint",

    "i8"  : "number",
    "i16" : "number",
    "i32" : "number",
    "i64" : "bigint",

    "f32" : "number",
    "f64" : "number",

    "bool"  : "boolean",
    "char"  : "number",
    "size_t": "number", // for wasm32

    "void"  : "void",
});

// value tells if prefix is required or not
const DEFINED_C_STRUCTS : Record<string, boolean> = Object.freeze({
});

// value tells if prefix is required or not
const DEFINED_C_ENUMS : Record<string, boolean> = Object.freeze({
});

type CBaseType = string;
interface CStruct {
    name      : string
    hasPrefix : boolean
};
interface CEnum {
    name      : string
    hasPrefix : boolean
};

type UnderlyingCType = "ctype" | "base" | "struct" | "enum";
interface CType {
    isConst           : boolean
    isPointer         : boolean
    isPointerConstant : boolean 

    underlyingCType   : UnderlyingCType
    underlyingValue   : CType | CBaseType | CEnum | CStruct

    cLiteral          : string
};

function createCTypeFromTokens(tokens : string[]) : CType | undefined {
    const _cLiteral = tokens.join(" ");
    const _tokenCount = tokens.length
    let _i = 0;

    let _leadingConstCount = 0;
    while (_i < _tokenCount && tokens[_i]! === "const") { _i++; _leadingConstCount++; }
    assert(_leadingConstCount < _tokenCount, `Invalid cType: '${_cLiteral}'\nIt only contains 'const'`);

    const _nextToken = tokens[_i]!;
    assert(!(C_BASE_TO_TS_BASE_MAPPING[_nextToken] === undefined && (DEFINED_C_ENUMS[_nextToken] === undefined && _nextToken != `struct`) && (DEFINED_C_ENUMS[_nextToken] === undefined && _nextToken != `enum`)), `Invalid cType: '${_cLiteral}'\nUnexpected token: ` + _nextToken);

    let _j = _tokenCount - 1;
    while (_j > -1 && tokens[_j] !== "*") {
        _j--;
    }
    if (_j === -1) {
        let _token = tokens[_i]!; _i++;
        if (C_BASE_TO_TS_BASE_MAPPING[_token] !== undefined) {
            assert(_i === _tokenCount, `Invalid cType: '${_cLiteral}'\nUnexpected token: '${tokens[_i]}'`);
            const _result : CType = {
                isConst : (_leadingConstCount > 0),
                isPointer : false,
                isPointerConstant : false,

                underlyingCType : "base",
                underlyingValue : _token,
                cLiteral        : _cLiteral,
            };
            return _result;
        }

        if (DEFINED_C_STRUCTS[_token] !== undefined) {
            assert(_i === _tokenCount, `Invalid cType: '${_cLiteral}'\nUnexpected token: '${tokens[_i]}'`);
            assert(!(DEFINED_C_STRUCTS[_token]!), `Invalid cType: '${_cLiteral}'\nMising struct prefix`);
            const _result : CType = {
                isConst : (_leadingConstCount > 0),
                isPointer : false,
                isPointerConstant : false,

                underlyingCType : "struct",
                underlyingValue : {
                    name : _token,
                    hasPrefix : false,
                cLiteral        : _cLiteral,
                } as CStruct,
                cLiteral        : _cLiteral,
            };
            return _result;
        } else if (_token === "struct") {
            assert(_i < _tokenCount, `Invalid cType: '${_cLiteral}'\nUnexpected end of type occured`);
            assert(_i === _tokenCount - 1, `Invalid cType: '${_cLiteral}'\nUnexpected token: '${tokens[_i + 2]}'`);
            _token = tokens[_i]!;
            assert(DEFINED_C_STRUCTS[_token] !== undefined, `Invalid cType: '${_cLiteral}'\nUndefined struct: '${_token}'`);
            const _result : CType = {
                isConst : (_leadingConstCount > 0),
                isPointer : false,
                isPointerConstant : false,

                underlyingCType : "struct",
                underlyingValue : {
                    name : _token,
                    hasPrefix : true
                } as CStruct,
                cLiteral        : _cLiteral,
            };
            return _result;
        }

        if (DEFINED_C_ENUMS[_token] !== undefined) {
            assert(_i === _tokenCount, `Invalid cType: '${_cLiteral}'\nUnexpected token: '${tokens[_i]}'`);
            assert(!(DEFINED_C_ENUMS[_token]!), `Invalid cType: '${_cLiteral}'\nMising enum prefix`);
            const _result : CType = {
                isConst : (_leadingConstCount > 0),
                isPointer : false,
                isPointerConstant : false,

                underlyingCType : "enum",
                underlyingValue : {
                    name : _token,
                    hasPrefix : false,
                } as CEnum,
                cLiteral        : _cLiteral,
            };
            return _result;
        } else if (_token === "enum") {
            assert(_i < _tokenCount, `Invalid cType: '${_cLiteral}'\nUnexpected end of type occured`);
            assert(_i === _tokenCount - 1, `Invalid cType: '${_cLiteral}'\nUnexpected token: '${tokens[_i + 2]}'`);
            _token = tokens[_i]!;
            assert(DEFINED_C_ENUMS[_token] !== undefined, `Invalid cType: '${_cLiteral}'\nUndefined enum: '${_token}'`);
            const _result : CType = {
                isConst : (_leadingConstCount > 0),
                isPointer : false,
                isPointerConstant : false,

                underlyingCType : "enum",
                underlyingValue : {
                    name : _token,
                    hasPrefix : true
                } as CEnum,
                cLiteral        : _cLiteral,
            };
            return _result;
        }
    } else if (_j === _tokenCount - 1) {
        return {
            isPointerConstant : (_leadingConstCount > 0),
            isPointer : true,
            isConst   : false,

            underlyingCType : "ctype",
            underlyingValue : createCTypeFromTokens(tokens.slice(_i, _j))!,
            cLiteral        : _cLiteral,
        } as CType;
    } else if (_j === _tokenCount - 2 && tokens[_j + 1]! === "const") {
        return {
            isPointerConstant : (_leadingConstCount > 0),
            isPointer : true,
            isConst   : true,

            underlyingCType : "ctype",
            underlyingValue : createCTypeFromTokens(tokens.slice(_i, _j))!,
            cLiteral        : _cLiteral,
        } as CType;
    } else {
        assert(false, `Invalid cType: '${_cLiteral}'\nexpected: [const] <underlyingType> [*[const]]`);
    }
}

function getTSType(ctype : CType) : (string) {
    if (ctype.isPointer) { return "number" }
    if (ctype.underlyingCType === "base") {
        return C_BASE_TO_TS_BASE_MAPPING[ctype.underlyingValue as string]!
    }else if (ctype.underlyingCType === "struct") {
        return (ctype.underlyingValue as CStruct).name
    } else if (ctype.underlyingCType === "enum") {
        return (ctype.underlyingValue as CEnum).name
    }
    return "unknown"
}
////////////////////////
// Extraction methods and helpers
////////////////////////

import fs from "node:fs"
import process from "node:process";

function assert(condition: boolean, exitMessage: string, exitCode?: number) {
    let _exitCode = exitCode ?? 0;
    if (!condition) { process.stdout.write(`\x1b[38;2;255;100;40m${exitMessage}\nProcess exited with code: ${_exitCode}\x1b[0m\n`); process.exit(_exitCode) }
}

const PLATFORM_IMPORT_MODULE_API_TOKEN = "PLATFORM_IMPORT_MODULE_METHOD"
const PLATFORM_EXPORT_API_TOKEN = "PLATFORM_EXPORT_METHOD"

function tokenizeContent(content: string, isDelim: (char: string) => boolean, includeDelim: boolean) {
    let    _tokens : string[] = [];
    let    _i = 0;
    const _contentLength = content.length;

    while (_i < _contentLength) {
        while (_i < _contentLength && isDelim(content[_i]!)) {
            if (includeDelim) { _tokens.push(content[_i]!); }
            _i++;
        }
        const _anchor = _i;
        while (_i < _contentLength && !isDelim(content[_i]!)) {
            _i++;
        }
        if (_anchor !== _i) { _tokens.push(content.slice(_anchor, _i)) }
    }

    return _tokens;
}

interface ImportModuleMethodBinding {
    importModuleName : string
    funcName         : string

    cFuncName        : string
    returnCType      : CType
    params           : { name : string, cType : CType}[]
};
const IMPORT_MODULES_METHOD_BINDING = new Map<string, ImportModuleMethodBinding[]>();
function padString(str : string, len: number, paddingChar: string, direction: "left" | "right") {
    const padding = (paddingChar[0] ?? ' ').repeat(len - str.length);
    if (direction == "left") {
        return padding + str;
    }
    return str + padding;
}
function generateTSCodeForIMPORT_MODULES() {
    const _PADDED_STRING_LENGTH = 30;
    const _PADDING_CHARACTER    = ' ';

    let _codeString = ``;
    let _idx = 0;
    IMPORT_MODULES_METHOD_BINDING.forEach((moduleValueArray, moduleName) => {
        if (_idx) { _codeString += "\n"; }
        _codeString += `export interface IMPORT_MODULE_${moduleName.toUpperCase()}_BINDING {\n`;
            _codeString += `  [key: string]: Function\n`
            _codeString += `_constructor(app: ApplicationInterface): void\n`;
        moduleValueArray.forEach((moduleValue) => {
            _codeString += `  /**\n`
            moduleValue.params.forEach((paramInfo) => {
                _codeString += `   * @param ${padString(paramInfo.name, _PADDED_STRING_LENGTH, _PADDING_CHARACTER, "right")} - ${paramInfo.cType.cLiteral}\n`;
            });
            _codeString += `   * @returns ${padString("", _PADDED_STRING_LENGTH, _PADDING_CHARACTER, "right")} ${moduleValue.returnCType.cLiteral}\n`;
            _codeString += `   */\n`
            _codeString += `  ${moduleValue.funcName}(`;
            const paramCount = moduleValue.params.length; 
            moduleValue.params.forEach((paramInfo, i) => {
                _codeString += `${paramInfo.name + ": " + getTSType(paramInfo.cType)}`;
                if (i + 1 !== paramCount) { _codeString += ", "; }
            });
            _codeString += `): ${getTSType(moduleValue.returnCType)};\n`;
        });
        _codeString += `} // IMPORT_MODULE_${moduleName.toUpperCase()}_BINDING\n\n`;
        _idx++;
    });
    _codeString += `export interface IMPORT_MODULE_OBJECT {\n`
    _codeString += `  [key: string]: { [key: string]: Function }\n`;;
        IMPORT_MODULES_METHOD_BINDING.forEach((_, moduleName) => {
            _codeString += `  "${moduleName}": IMPORT_MODULE_${moduleName.toUpperCase()}_BINDING\n`;
        });
    _codeString += `} // IMPORT_MODULE_OBJECT\n\n`;
    return _codeString;
}

function generateTSCodeForIMPORT_MODULE_FUNCTION_SIGNATURES() {
    let _codeString = `const _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING : { [key: string]: readonly string[] }= Object.freeze({\n`;
    IMPORT_MODULES_METHOD_BINDING.forEach((moduleValueArray, moduleName) => {
        _codeString += `  "${moduleName}": Object.freeze([\n`;
        moduleValueArray.forEach((moduleInfo) => {
            _codeString += `    "${moduleInfo.funcName}",\n`;
        });
        _codeString += `  ]), // IMPORT_MODULE_${moduleName.toUpperCase()}_BINDING\n`;
    });
    _codeString += `}); // _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING\n\n`;
    return _codeString;
}


interface ExportMethodBinding {
    funcName         : string

    cFuncName        : string
    returnCType      : CType
    params           : { name : string, cType : CType}[]
};
const EXPORTED_METHODS : ExportMethodBinding[] = [];
function generateTSCodeForEXPORT_METHODS() {
    const _PADDED_STRING_LENGTH = 30;
    const _PADDING_CHARACTER    = ' ';

    let _codeString = ``;
    _codeString += `export interface EXPORT_METHODS {\n`;
        _codeString += `  [key: string]: Function`;
    EXPORTED_METHODS.forEach((methodInfo) => {
            _codeString += `  /**\n`
            methodInfo.params.forEach((paramInfo) => {
                _codeString += `   * @param ${padString(paramInfo.name, _PADDED_STRING_LENGTH, _PADDING_CHARACTER, "right")} - ${paramInfo.cType.cLiteral}\n`;
            });
            _codeString += `   * @returns ${padString("", _PADDED_STRING_LENGTH, _PADDING_CHARACTER, "right")} ${methodInfo.returnCType.cLiteral}\n`;
            _codeString += `   */\n`
            _codeString += `  ${methodInfo.funcName}(`;
            const paramCount = methodInfo.params.length; 
            methodInfo.params.forEach((paramInfo, i) => {
                _codeString += `${paramInfo.name + ": " + getTSType(paramInfo.cType)}`;
                if (i + 1 !== paramCount) { _codeString += ", "; }
            });
            _codeString += `): ${getTSType(methodInfo.returnCType)};\n`;
    });
    _codeString += `} // EXPORT_METHODS \n\n`;
    _codeString += `const _EXPORT_OBJECT_FUNCTION_NAME_ARRAY = Object.freeze([\n`
    EXPORTED_METHODS.forEach((methodInfo) => {
        _codeString += `    "${methodInfo.funcName}",\n`;
    });
    _codeString += `]); // _EXPORT_OBJECT_FUNCTION_NAME_ARRAY\n\n`;
    return _codeString;
}


function processTokens(tokens: string[]): ExportMethodBinding | ImportModuleMethodBinding {
    let _tokenCount = tokens.length;
    let _i = 0;

    function assertEOTlist() {
        assert(_i < _tokenCount, "Unexpected End of Token list");
    }

    function assertTokenMatch(match: string) {
        assertEOTlist()
        assert(tokens[_i]! === match, `Found token: '${tokens[_i]!}' expected: '${match}'`);
    }

    function getNextToken() {
        _i++; assertEOTlist();
        return tokens[_i]!;
    }

    const _genericBinding : ImportModuleMethodBinding & ExportMethodBinding = {
        importModuleName : undefined as unknown as string,
        funcName         : "",

        cFuncName        : "",
        returnCType      : null as unknown as CType,
        params           : []
    };

    let _creatingBindingForImport : boolean = false;

    if (tokens[_i] === PLATFORM_EXPORT_API_TOKEN) {
        _creatingBindingForImport = false;
    }else if (tokens[_i] === PLATFORM_IMPORT_MODULE_API_TOKEN) {
        _creatingBindingForImport = true;
    }else {
        assert(false, `Expected either: '${PLATFORM_EXPORT_API_TOKEN}' or '${PLATFORM_IMPORT_MODULE_API_TOKEN}'`);
    }
    getNextToken();
    assertTokenMatch("(");

    if (_creatingBindingForImport) {
        _genericBinding.importModuleName = getNextToken(); getNextToken();
        assertTokenMatch(",");
    }

    _genericBinding.funcName = getNextToken(); getNextToken();
    assertTokenMatch(",");

    const _returnTypeCTokens : string[] = [];
    while (getNextToken() !== ",") { _returnTypeCTokens.push(tokens[_i]!); }
    assertTokenMatch(",");
    _genericBinding.returnCType = createCTypeFromTokens(_returnTypeCTokens)!;

    _genericBinding.cFuncName = getNextToken(); _i++;
    const params : ImportModuleMethodBinding["params"] = [];
    while (_i < _tokenCount && tokens[_i] !== ")") {
        if (tokens[_i] === ",") { _i++; continue; }
        const paramInfoTokens : string[] = [];
        while (_i < _tokenCount && tokens[_i] !== ")" && tokens[_i] !== ",") {
            paramInfoTokens.push(tokens[_i++]!)
        }
        const paramInfoTokensCount = paramInfoTokens.length;
        params.push({
            name : paramInfoTokens[paramInfoTokensCount - 1]!,
            cType  : createCTypeFromTokens(paramInfoTokens.slice(0, paramInfoTokensCount - 1))!,
        });
    }
    _genericBinding.params = params;
    assertTokenMatch(")"); getNextToken();
    assertTokenMatch(";"); _i++;

    assert(_i == _tokenCount, `Expected EOL, found: '${tokens[_i]!}'`);

    if (_creatingBindingForImport) {
        return {
            ..._genericBinding,
        } as ImportModuleMethodBinding;
    }
    return {
        ..._genericBinding,
    } as ExportMethodBinding;
}

function handleBinding(binding: ImportModuleMethodBinding | ExportMethodBinding) {
    if ((binding as ImportModuleMethodBinding)["importModuleName"] === undefined) {
        EXPORTED_METHODS.push(binding as ExportMethodBinding);
    }else {
        const trueBinding = binding as ImportModuleMethodBinding;
        IMPORT_MODULES_METHOD_BINDING.set(trueBinding.importModuleName, [...(IMPORT_MODULES_METHOD_BINDING.get(trueBinding.importModuleName) ?? []), trueBinding]);
    }
}

function createBindingsFromContent(content: string) {
    const _ALLOWED_DELIMITERS = Object.freeze(new Set<string>(["(", ")", "*", ",", ";"]));
    function tokensizeDeclLine(line: string) : string[] {
        const _tokens = tokenizeContent(line, function (c : string) { return c === " " || c === "\n" || c === "\t"; }, false)
        const _createdTokens : string[] = []
        for (let _token of _tokens) {
            _createdTokens.push(...tokenizeContent(_token, function (c : string) { return _ALLOWED_DELIMITERS.has(c) }, true))
        }
        return _createdTokens;
    }

    const _lines = Object.freeze(tokenizeContent(content, function (char: string) { return (char[0]!) === '\n'; }, false));
    const _lineCount = _lines.length
    let _lineIndex = 0;
    while (_lineIndex < _lineCount) {
        const _line = _lines[_lineIndex]!;
        if (
            _line.indexOf(PLATFORM_IMPORT_MODULE_API_TOKEN) === -1 &&
            _line.indexOf(PLATFORM_EXPORT_API_TOKEN) === -1
           ) { _lineIndex++; continue; }
        const _anchor = _lineIndex;
        const _tokens : string[] = tokensizeDeclLine(_line);
        _lineIndex++;
        while (_tokens.length !== 0 && _tokens[_tokens.length - 1]! !== ";") {
            _tokens.push(...tokensizeDeclLine(_lines[_lineIndex]!))
            _lineIndex++;
        }
        assert(!(_tokens.length !== 0 && _tokens[_tokens.length - 1]! !== ";"), (`Missing ';' for declaration of line:${_anchor + 1}`));
        handleBinding(processTokens(_tokens));
    }
}

const APPLICATION_CODE = `
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
    sharedAssets : {
        textDecoder : TextDecoder
        canvas      : HTMLCanvasElement
    }
};

export class Application implements ApplicationInterface {
    static async createApplication(wasmFilePath: string, importObject: IMPORT_MODULE_OBJECT, sharedAssets: ApplicationInterface["sharedAssets"]) {
        const wasmImports : Record<string, Record<string, Function>> = {};
        for (let moduleName in _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING) {
            const sourceModule = importObject[moduleName]!;
            if (!sourceModule) { throw Error(\`Missing module: '\${moduleName}' from 'importObject' argument\`); }
            if (sourceModule["appInterface"] !== undefined) { (sourceModule["appInterface"] as any) = this; }

            wasmImports[moduleName] = {};
            const moduleFunctionNameArray = _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING[moduleName]!;
            if (!moduleFunctionNameArray) { throw Error(\`Missing function mapping for module: '\${moduleName}'\`); }
            for (let functionName of moduleFunctionNameArray) {
                if (!sourceModule[functionName]) {throw Error(\`Missing function: '\${functionName}' from module: '\${moduleName}'\`); }
                wasmImports[moduleName][functionName] = sourceModule[functionName]!.bind(sourceModule);
            }
        }
        const wasmSource = await WebAssembly.instantiateStreaming(fetch(wasmFilePath), wasmImports);
        const app = new Application(wasmSource, sharedAssets)!;
        for (let moduleName in _IMPORT_MODULE_OBJECT_FUNCTION_NAME_ARRAY_MAPPING) {
            ((importObject[moduleName]!._constructor as Function)(app! as ApplicationInterface));
        }
        return app;
    }

    private constructor(wasmSource: WebAssembly.WebAssemblyInstantiatedSource, sharedAssets: ApplicationInterface["sharedAssets"]) {
        this.wasmSource = wasmSource;
        this.sharedAssets = sharedAssets;
        this.mapExportedMethods();
        this.initializeMemoryObject();
   }

   private mapExportedMethods() {
       const exports = this.wasmSource.instance.exports;
       for (let exportMethodName of _EXPORT_OBJECT_FUNCTION_NAME_ARRAY) {
           const exportedMethod = exports[exportMethodName] as Function
           if (!exportedMethod) { throw Error(\`Missing exported function: '\${exportMethodName}' in wasm source\`) };
           this.methods[exportMethodName] = exportedMethod;
       }
   }

   private initializeMemoryObject() {
       const exports = this.wasmSource.instance.exports;
       const wasmMemory = exports.memory as WebAssembly.Memory;
       if (!wasmMemory || !wasmMemory.buffer.byteLength) { throw Error(\`Missing 'memory' export in wasm source\`); }

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
            sharedAssets = {} as ApplicationInterface["sharedAssets"]
};
`;

function main() {
    console.log("You can customize the application implementation! and this file too");

    // All the paths are relative to project directory!!!
    
    const _INPUT_DIRECTORY_PATH = "./platform/modules/"
    const _dirInfo = fs.readdirSync(_INPUT_DIRECTORY_PATH);
    _dirInfo.forEach((dirEntry) => {
        console.log(`[Log]: Reading file: '${_INPUT_DIRECTORY_PATH + "/" + dirEntry}' ...`);
        createBindingsFromContent( fs.readFileSync(_INPUT_DIRECTORY_PATH + "/" + dirEntry, "utf-8") );
    });

    const _EXPORT_METHOD_HEADER_FILEPATH = "./src/export.h";
    createBindingsFromContent(fs.readFileSync(_EXPORT_METHOD_HEADER_FILEPATH, "utf-8"));


    const _OUTPUT_FILEPATH = "./platform/implementation/web/bindings.ts"
    let _outputString = 
        generateTSCodeForIMPORT_MODULES() +
        generateTSCodeForIMPORT_MODULE_FUNCTION_SIGNATURES() +
        generateTSCodeForEXPORT_METHODS() +
        APPLICATION_CODE
    ;
    fs.writeFileSync(_OUTPUT_FILEPATH, _outputString);
}

main();

