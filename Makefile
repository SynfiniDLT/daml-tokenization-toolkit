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

.build/tokenization-util.dar: .lib $(shell ./find-daml-project-files.sh util/main)
	cd util/main && daml build -o ../../.build/tokenization-util.dar

.build/trackable-holding.dar: .lib $(shell ./find-daml-project-files.sh trackable-holding/main)
	cd trackable-holding/main && daml build -o ../../.build/trackable-holding.dar

.build/trackable-settlement.dar: .lib $(shell ./find-daml-project-files.sh trackable-settlement/main)
	cd trackable-settlement/main && daml build -o ../../.build/trackable-settlement.dar

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
.build/account-onboarding-one-time-offer-interface.dar: .lib $(shell ./find-daml-project-files.sh account-onboarding/one-time-offer-interface)
	cd account-onboarding/one-time-offer-interface && daml build -o ../../.build/account-onboarding-one-time-offer-interface.dar

.build/account-onboarding-one-time-offer.dar: .build/account-onboarding-one-time-offer-interface.dar $(shell ./find-daml-project-files.sh account-onboarding/one-time-offer-implementation)
	cd account-onboarding/one-time-offer-implementation && daml build -o ../../.build/account-onboarding-one-time-offer.dar

.build/account-onboarding-open-offer-interface.dar: .lib $(shell ./find-daml-project-files.sh account-onboarding/open-offer-interface)
	cd account-onboarding/open-offer-interface && daml build -o ../../.build/account-onboarding-open-offer-interface.dar

.build/account-onboarding-open-offer.dar: .build/account-onboarding-open-offer-interface.dar $(shell ./find-daml-project-files.sh account-onboarding/open-offer-implementation)
	cd account-onboarding/open-offer-implementation && daml build -o ../../.build/account-onboarding-open-offer.dar

.build/tokenization-onboarding.dar: .lib .build/trackable-holding.dar .build/daml-mint.dar .build/fund-tokenization.dar .build/pbt.dar $(shell ./find-daml-project-files.sh onboarding/main)
	cd onboarding/main && daml build -o ../../.build/tokenization-onboarding.dar

.PHONY: build-onboarding
build-onboarding: .build/tokenization-onboarding.dar

.PHONY: install-onboarding
install-onboarding: .build/tokenization-onboarding.dar
	export DOPS_DAR=../.build/tokenization-onboarding.dar && cd onboarding && ./install.sh
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

.PHONY: compile-wallet-views
compile-wallet-views: wallet-views/java/src/generated-main/java
	cd wallet-views/java && mvn compile

.PHONY: build-wallet-views
build-wallet-views: wallet-views/java/src/generated-main/java
	cd wallet-views/java && mvn install -Dmaven.test.skip=true

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

.PHONY: test-wallet-views-client
test-wallet-views-client: install-onboarding compile-wallet-views wallet-views/typescript-client/lib
	cd wallet-views/typescript-client && ./test.sh
## END wallet-views

## BEGIN wallet ui
wallet-ui/daml.js: .lib .build/fund-tokenization.dar .build/daml-mint.dar .build/pbt-interface.dar 
	rm -rf wallet-ui/daml.js
	daml codegen js .lib/daml-finance-interface-util.dar .build/fund-tokenization.dar .lib/daml-finance-interface-holding.dar .build/daml-mint.dar .build/pbt-interface.dar -o wallet-ui/daml.js

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
	cd trackable-holding/main && daml clean
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
