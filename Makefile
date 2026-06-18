MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

_:
	@echo "Here is guide to configure your project (For generic Linux users):"
	@echo "  - Install required node packages"
	@echo "  - Configure scripts/web_binding_generator.ts (see example code to know better of the file)"
	@echo "  - Configure this Makefile, adjust the code, modify the parts you do not need"

run-web-demo: build-web
	@echo -e "\x1b[38;2;0;140;255mSyncing code base\x1b[0m"
	cp -r build/web/* demo/web/wasm/
	cp -r platform/implementation/web/* demo/web/src/
	rm -rf demo/web/src/.*c
	cd demo/web && tsc && python -m http.server 6969

build-web:
	clang --target=wasm32 -Wl,--no-entry -Wl,--allow-undefined -nostdlib                \
		-std=c23 -Wall -Werror -Wextra -Wpedantic -O3 -Wno-gnu-null-pointer-arithmetic  \
		-o build/web/wxt.wasm 								                            \
		-I${MAKEFILE_DIR}																\
		-DWXT_PLATFORM_WEB												 		 	 	\
		src/export.c
	${HOME}/workspace/install/wabt/wasm2wat build/web/wxt.wasm > build/web/wxt.wat
	@echo -e "\x1b[38;2;0;140;255mCreating Web definitions\x1b[0m"
	node scripts/web_binding_generator.ts
