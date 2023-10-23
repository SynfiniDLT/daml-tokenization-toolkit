# Conf file is used to configure dependencies on Daml Finance
# It has been copied from https://github.com/digital-asset/daml-finance/blob/8a4b826a683364f06f6dd1068a3d2f15f03ff6e6/docs/code-samples/tutorials-config/0.0.3.conf
.lib: dependencies.conf
	./get-dependencies.sh

.PHONY: install-custom-views
install-custom-views:
	cd custom-views && \
	sbt 'set test in assembly := {}' clean assembly && \
	mvn install:install-file \
		-Dfile=target/scala-2.13/custom-views-assembly-LOCAL-SNAPSHOT.jar \
		-DgroupId=com.daml \
		-DartifactId=custom-views_2.13 \
		-Dversion=assembly-LOCAL-SNAPSHOT \
		-Dpackaging=jar \
		-DgeneratePom=true

.build/tokenization-util.dar: .lib
	cd util/main && daml build -o ../../.build/tokenization-util.dar

## BEGIN mint
.build/daml-mint.dar: .lib .build/tokenization-util.dar $(shell ./find-daml-project-files.sh mint/main)
	cd mint/main && daml build -o ../../.build/daml-mint.dar

.PHONY: build-mint
build-mint: .build/daml-mint.dar

# Codegen
mint/java-example/src/generated-main/java: .build/daml-mint.dar
	rm -rf mint/java-example/src/generated-main/java
	daml codegen java -o mint/java-example/src/generated-main/java .build/daml-mint.dar

.PHONY: build-mint-java-example
build-mint-java-example: mint/java-example/src/generated-main/java $(shell ./find-java-project-files.sh mint/java-example)
	cd mint/java-example && mvn compile

.PHONY: test-mint
test-mint: .build/daml-mint.dar
	cd mint/test && daml test
## END mint

## BEGIN fund
.build/fund-tokenization.dar: .lib .build/tokenization-util.dar $(shell ./find-daml-project-files.sh fund/main)
	cd fund/main && daml build -o ../../.build/fund-tokenization.dar

.PHONY: build-fund
build-fund: .build/fund-tokenization.dar

.PHONY: test-fund
test-fund: .build/fund-tokenization.dar
	cd fund/test && daml test
## END fund

## BEGIN onboarding
.build/tokenization-onboarding.dar: .lib .build/daml-mint.dar .build/fund-tokenization.dar .build/pbt.dar $(shell ./find-daml-project-files.sh onboarding/main)
	cd onboarding/main && daml build -o ../../.build/tokenization-onboarding.dar

.PHONY: build-onboarding
build-onboarding: .build/tokenization-onboarding.dar
## END onboarding

## BEGIN pbt
.build/pbt-interface.dar: .lib $(shell ./find-daml-project-files.sh pbt/interface)
	cd pbt/interface && daml build -o ../../.build/pbt-interface.dar

.build/pbt.dar: .lib .build/pbt-interface.dar $(shell ./find-daml-project-files.sh pbt/implementation)
	cd pbt/implementation && daml build -o ../../.build/pbt.dar

.PHONY: build-pbt
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
	daml codegen java \
		-o wallet-views/java/src/generated-test/java \
		.lib/daml-finance-account.dar .lib/daml-finance-holding.dar \
		.lib/daml-finance-settlement.dar \
		.lib/daml-finance-instrument-token.dar \
		.build/pbt.dar

.PHONY: build-wallet-views
build-wallet-views: wallet-views/java/src/generated-main/java
	cd wallet-views/java && mvn compile

.PHONY: test-wallet-views
test-wallet-views: wallet-views/java/src/generated-main/java wallet-views/java/src/generated-test/java
	cd wallet-views/java && mvn test ${TEST_WALLET_VIEWS_ARGS}

# Codegen - TypeScript
wallet-views/typescript-client/daml.js: .build/daml-wallet-views-types.dar
	rm -rf wallet-views/typescript-client/daml.js
	daml codegen js .build/daml-wallet-views-types.dar -o wallet-views/typescript-client/daml.js

wallet-views/typescript-client/lib: wallet-views/typescript-client/daml.js $(shell ./find-ts-project-files.sh wallet-views/typescript-client)
	cd wallet-views/typescript-client && npm install && npm run build

.PHONY: build-wallet-views-client
build-wallet-views-client: wallet-views/typescript-client/lib

# TODO test client
## END wallet-views

## BEGIN wallet ui
wallet-ui/daml.js: .lib .build/fund-tokenization.dar
	daml codegen js .lib/daml-finance-interface-util.dar .build/fund-tokenization.dar -o wallet-ui/daml.js

.PHONY: build-wallet-ui
build-wallet-ui: wallet-ui/daml.js wallet-views/typescript-client/lib $(shell ./find-ts-project-files.sh wallet-ui)
	cd wallet-ui && npm install && npm run build

.PHONY: start-wallet-ui
start-wallet-ui: wallet-ui/daml.js wallet-views/typescript-client/lib
	cd wallet-ui && npm install && npm start
## END wallet ui

.PHONY: clean
clean:
	cd util/main && daml clean
	cd mint/main && daml clean
	cd mint/test && daml clean
	cd mint/java-example && mvn clean && rm -rf src/generated-main
	cd fund/main && daml clean
	cd fund/test && daml clean
	cd onboarding/main && daml clean
	cd pbt/interface && daml clean
	cd pbt/implementation && daml clean
	cd wallet-views/types && daml clean
	cd wallet-views/java && mvn clean
	rm -rf wallet-views/typescript-client/daml.js wallet-views/typescript-client/node_modules wallet-views/typescript-client/lib
	rm -rf wallet-ui/node_modules wallet-ui/build
	rm -rf .build
	rm -rf .lib
