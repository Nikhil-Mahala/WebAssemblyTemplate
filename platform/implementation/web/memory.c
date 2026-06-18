#ifndef PLATFORM_WEB
#error "Cannot include web/memory.c for non platform builds"
#endif
#include "../../defs.h"
void *PLATFORM_memset(void *dst, int c, size_t n) {
    u8 *p = (u8 *)dst;
    for (size_t i = 0; i < n; ++i) { *p++ = (u8)c; }
    return dst;
}

void *PLATFORM_memcpy(void *dst, const void *src, size_t n) {
    u8 *d = (u8 *)dst;
    const u8 *s = (const u8 *)src;
    for (size_t i = 0; i < n; ++i) { *d++ = *s++; }
    return dst;
}

void *PLATFORM_memmove(void *dst, const void *src, size_t n) {
    u8 *d = (u8 *)dst;
    const u8 *s = (const u8 *)src;

    if (d < s) {
        for (size_t i = 0; i < n; ++i) { *d++ = *s++; }
    } else {
        d += n;
        s += n;
        for (size_t i = 0; i < n; ++i) { *--d = *--s; } 
    }

    return dst;
}

extern unsigned char __heap_base;
static u_mem_addr brk = 0;
void *wasm_sbrk(int);

#define PAGE_SIZE 65536
#define HAVE_MORECORE 1
#define MORECORE wasm_sbrk
#define MORECORE_CONTIGUOUS 1
#define MORECORE_CANNOT_TRIM 1

#define HAVE_MREMAP 0
#define HAVE_MMAP 0

#define LACKS_UNISTD_H 1
#define LACKS_SYS_PARAM_H 1
#define LACKS_ERRNO_H 1
#define LACKS_FCNTL_H 1
#define LACKS_TIME_H 1
#define LACKS_STRING_H 1
#define LACKS_STDLIB_H 1
#define USE_LOCKS 0

#define NO_MALLINFO 1
#define NO_MALLOC_STATS 1

#define ABORT __builtin_trap()
#define MALLOC_FAILURE_ACTION

#define malloc_getpagesize PAGE_SIZE
#define	EPERM		 1	/* Operation not permitted */
#define	ENOENT		 2	/* No such file or directory */
#define	ESRCH		 3	/* No such process */
#define	EINTR		 4	/* Interrupted system call */
#define	EIO		 5	/* I/O error */
#define	ENXIO		 6	/* No such device or address */
#define	E2BIG		 7	/* Argument list too long */
#define	ENOEXEC		 8	/* Exec format error */
#define	EBADF		 9	/* Bad file number */
#define	ECHILD		10	/* No child processes */
#define	EAGAIN		11	/* Try again */
#define	ENOMEM		12	/* Out of memory */
#define	EACCES		13	/* Permission denied */
#define	EFAULT		14	/* Bad address */
#define	ENOTBLK		15	/* Block device required */
#define	EBUSY		16	/* Device or resource busy */
#define	EEXIST		17	/* File exists */
#define	EXDEV		18	/* Cross-device link */
#define	ENODEV		19	/* No such device */
#define	ENOTDIR		20	/* Not a directory */
#define	EISDIR		21	/* Is a directory */
#define	EINVAL		22	/* Invalid argument */
#define	ENFILE		23	/* File table overflow */
#define	EMFILE		24	/* Too many open files */
#define	ENOTTY		25	/* Not a typewriter */
#define	ETXTBSY		26	/* Text file busy */
#define	EFBIG		27	/* File too large */
#define	ENOSPC		28	/* No space left on device */
#define	ESPIPE		29	/* Illegal seek */
#define	EROFS		30	/* Read-only file system */
#define	EMLINK		31	/* Too many links */
#define	EPIPE		32	/* Broken pipe */
#define	EDOM		33	/* Math argument out of domain of func */
#define	ERANGE		34	/* Math result not representable */

#define memset PLATFORM_memset
#define memcpy PLATFORM_memcpy
#include "./dlmalloc.c"
#undef memset
#undef memcpy

void *wasm_sbrk(int increment) {
    if (increment < 0)
        return (void *)-1;

    if (brk == 0)
        brk = (u_mem_addr)&__heap_base;

    if ((u_mem_addr)increment > UINTPTR_MAX - brk)
        return (void *)-1;

    u_mem_addr old = brk;
    u_mem_addr next = brk + (u_mem_addr)increment;

    u_mem_addr pages = __builtin_wasm_memory_size(0);
    u_mem_addr bytes = pages * PAGE_SIZE;

    if (next > bytes) {
        u_mem_addr need = next - bytes;
        u_mem_addr grow = (need + PAGE_SIZE - 1) / PAGE_SIZE;

        if (__builtin_wasm_memory_grow(0, grow) == (size_t)-1)
            return (void *)-1;
    }

    brk = next;
    return (void *)old;
}

void *PLATFORM_malloc(size_t byte_count) {
    return dlmalloc(byte_count);
}
void  PLATFORM_free  (void *data) {
    if (data != nullptr) {
        dlfree(data);
    }
}
void *PLATFORM_realloc(void *data, size_t new_byte_count) {
    return dlrealloc(data, new_byte_count);
}
