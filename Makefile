.PHONY: build-mint build-mint-demo start-mint-demo-local build-mint-java test-mint build-onboarding build-pbt build-wallet-views test-wallet-views build-wallet-views-client test-wallet-views-client build-wallet-ui clean

# Conf file is used to configure dependencies on Daml Finance
# It has been copied from https://github.com/digital-asset/daml-finance/blob/8a4b826a683364f06f6dd1068a3d2f15f03ff6e6/docs/code-samples/tutorials-config/0.0.3.conf
.lib: dependencies.conf
	./get-dependencies.sh

## BEGIN mint
.build/daml-mint.dar: .lib $(shell ./find-daml-project-files.sh mint/main)
	cd mint/main && daml build -o ../../.build/daml-mint.dar

.build/daml-mint-demo.dar: .build/daml-mint.dar $(shell ./find-daml-project-files.sh mint/demo)
	cd mint/demo && daml build -o ../../.build/daml-mint-demo.dar

build-mint: .build/daml-mint.dar

build-mint-demo: .build/daml-mint-demo.dar

start-mint-demo-local: .build/daml-mint.dar
	cd mint/demo && daml start

# Codegen
mint/java-example/src/generated-main/java: .build/daml-mint.dar
	rm -rf mint/java-example/src/generated-main/java
	daml codegen java -o mint/java-example/src/generated-main/java .build/daml-mint.dar

build-mint-java: mint/java-example/src/generated-main/java $(shell ./find-java-project-files.sh mint/java-example)
	cd mint/java-example && mvn compile

test-mint: .build/daml-mint.dar
	cd mint/test && daml test
## END mint

## BEGIN onboarding
.build/tokenization-onboarding.dar: .lib .build/daml-mint.dar onboarding/main/daml.yaml $(shell ./find-daml-project-files.sh onboarding/main)
	cd onboarding/main && daml build -o ../../.build/tokenization-onboarding.dar

build-onboarding: .build/tokenization-onboarding.dar
## END onboarding

## BEGIN pbt
.build/pbt-interface.dar: .lib $(shell ./find-daml-project-files.sh pbt/interface)
	cd pbt/interface && daml build -o ../../.build/pbt-interface.dar

.build/pbt.dar: .lib .build/pbt-interface.dar $(shell ./find-daml-project-files.sh pbt/implementation)
	cd pbt/implementation && daml build -o ../../.build/pbt.dar

build-pbt: .build/pbt.dar
## END pbt

## BEGIN wallet-views
.build/daml-wallet-views-types.dar: .lib .build/pbt-interface.dar $(shell ./find-daml-project-files.sh wallet-views/types)
	cd wallet-views/types && daml build -o ../../.build/daml-wallet-views-types.dar

# Codegen - java
wallet-views/java/src/generated-main/java: .build/daml-wallet-views-types.dar
	rm -rf wallet-views/java/src/generated-main/java
	daml codegen java -o wallet-views/java/src/generated-main/java .build/daml-wallet-views-types.dar

wallet-views/java/src/generated-test/java: .lib .build/pbt.dar
	rm -rf wallet-views/java/src/generated-test/java
	daml codegen java -o wallet-views/java/src/generated-test/java .lib/daml-finance-account.dar .lib/daml-finance-holding.dar .lib/daml-finance-settlement.dar .build/pbt.dar

build-wallet-views: wallet-views/java/src/generated-main/java
	cd wallet-views/java && mvn compile

test-wallet-views: wallet-views/java/src/generated-main/java wallet-views/java/src/generated-test/java
	cd wallet-views/java && mvn test

# Codegen - TypeScript
wallet-views/typescript-client/daml.js: .build/daml-wallet-views-types.dar
	rm -rf wallet-views/typescript-client/daml.js
	daml codegen js .build/daml-wallet-views-types.dar -o wallet-views/typescript-client/daml.js

wallet-views/typescript-client/lib: wallet-views/typescript-client/daml.js
	cd wallet-views/typescript-client && npm install && npm run build

build-wallet-views-client: wallet-views/typescript-client/lib

# TODO test client
## END wallet-views

## BEGIN wallet ui
build-wallet-ui: wallet-views/typescript-client/lib
	cd wallet-ui && npm install && npm run build
## END wallet ui

clean:
	cd mint/main && daml clean
	cd mint/test && daml clean
	cd mint/demo && daml clean
	cd mint/java-example && mvn clean && rm -rf src/generated-main
	cd onboarding/main && daml clean
	cd pbt/interface && daml clean
	cd pbt/implementation && daml clean
	cd wallet-views/types && daml clean
	cd wallet-views/java && mvn clean
	rm -rf wallet-views/typescript-client/daml.js wallet-views/typescript-client/node_modules wallet-views/typescript-client/lib
	rm -rf wallet-ui/node_modules wallet-ui/build
	rm -rf .build
	rm -rf .lib
