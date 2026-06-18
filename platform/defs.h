#ifndef _PLAFORM_DEFS_H_
#define _PLAFORM_DEFS_H_
#include <stdint.h>
#include <stddef.h>

typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;

typedef int8_t  i8;
typedef int16_t i16;
typedef int32_t i32;
typedef int64_t i64;

typedef float   f32;
typedef double  f64;

typedef intptr_t  s_mem_addr;
typedef uintptr_t u_mem_addr;
typedef ptrdiff_t   mem_diff;

inline size_t PLATFORM_internal_strlen(const char * ptr) {
    size_t len = 0;
    while (*(ptr + len) != 0) {
        len++;
    }
    return len;
}

#define PLATFORM_strlen(str) (__builtin_constant_p(str) ? __builtin_strlen(str) : PLATFORM_internal_strlen(str))

#if defined(PLATFORM_WEB)
    #define PLATFORM_IMPORT_MODULE_METHOD(IMPORT_MODULE, IMPORT_NAME, RETURN_TYPE, FUNCTION_NAME, ...) \
        __attribute__((import_module(#IMPORT_MODULE), import_name(#IMPORT_NAME)))     \
        extern RETURN_TYPE PLATFORM_##IMPORT_MODULE##_##FUNCTION_NAME(__VA_ARGS__)

    #define PLATFORM_EXPORT_METHOD(EXPORT_NAME, RETURN_TYPE, FUNCTION_NAME, ...) \
        __attribute__((export_name(#EXPORT_NAME)))                            \
        RETURN_TYPE FUNCTION_NAME(__VA_ARGS__)

void *PLATFORM_malloc (size_t);
void *PLATFORM_realloc(void *, size_t);
void  PLATFORM_free   (void *);


#else // platform native
    #define PLATFORM_IMPORT_MODULE_METHOD(IMPORT_MODULE, IMPORT_NAME, RETURN_TYPE, FUNCTION_NAME, ...) \
        extern RETURN_TYPE PLATFORM_##IMPORT_MODULE##_##FUNCTION_NAME(__VA_ARGS__)

    #define PLATFORM_EXPORT_METHOD(EXPORT_NAME, RETURN_TYPE, FUNCTION_NAME, ...) \
        RETURN_TYPE FUNCTION_NAME(__VA_ARGS__)

#include <stdlib.h>
#define PLATFORM_malloc  malloc
#define PLATFORM_realloc realloc
#define PLATFORM_free    free
#endif

#endif // _PLAFORM_DEFS_H_
