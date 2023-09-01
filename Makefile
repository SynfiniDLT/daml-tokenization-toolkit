.PHONY: build-main build-demo start-demo-local build-java test clean

# Conf file is used to configure dependencies on Daml Finance
# It has been copied from https://github.com/digital-asset/daml-finance/blob/8a4b826a683364f06f6dd1068a3d2f15f03ff6e6/docs/code-samples/tutorials-config/0.0.3.conf
.lib: dependencies.conf
	./get-dependencies.sh

.build/daml-mint.dar: .lib main/daml.yaml $(shell find main -name '*.daml')
	cd main && daml build -o ../.build/daml-mint.dar

.build/daml-mint-demo.dar: demo/daml.yaml $(shell find demo -name '*.daml')
	cd demo && daml build -o ../.build/daml-mint-demo.dar

build-main: .build/daml-mint.dar

build-demo: .build/daml-mint-demo.dar

start-demo-local: .build/daml-mint.dar
	cd demo && daml start

java-example/src/generated-main/java: .build/daml-mint.dar
	rm -rf java-example/src/generated-main/java
	daml codegen java -o java-example/src/generated-main/java .build/daml-mint.dar

build-java: java-example/src/generated-main/java java-example/pom.xml $(shell find java-example/src/main -type f)
	cd java-example && mvn compile

test: .build/daml-mint.dar test/daml.yaml $(shell find test -name '*.daml')
	cd test && daml test

clean:
	cd main && daml clean
	cd test && daml clean
	cd demo && daml clean
	cd java-example && mvn clean && rm -rf src/generated-main
	rm -rf .build
	rm -rf .lib
