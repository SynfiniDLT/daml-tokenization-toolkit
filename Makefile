proj_root = $(shell pwd)

# Dar dependencies
daml_finance_dir = .lib

# Dar build outputs
build_dir = .build
util_dar = $(build_dir)/tokenization-util.dar
trackable_holding_dar = $(build_dir)/trackable-holding.dar
trackable_settlement_dar = $(build_dir)/trackable-settlement.dar
account_onboarding_one_time_offer_interface_dar = $(build_dir)/account-onboarding-one-time-offer-interface.dar
account_onboarding_one_time_offer_dar = $(build_dir)/account-onboarding-one-time-offer.dar
account_onboarding_open_offer_interface_dar = $(build_dir)/account-onboarding-open-offer-interface.dar
account_onboarding_open_offer_dar = $(build_dir)/account-onboarding-open-offer.dar
issuer_onboarding_token_interface_dar = $(build_dir)/issuer-onboarding-token-interface.dar
issuer_onboarding_token_dar = $(build_dir)/issuer-onboarding-token.dar
onboarding_scripts_dar = $(build_dir)/tokenization-onboarding.dar
minter_burner_interface_dar = $(build_dir)/issuer-onboarding-minter-burner-interface.dar
minter_burner_dar = $(build_dir)/issuer-onboarding-minter-burner.dar
primary_issuance_one_time_offer_interface_dar = $(build_dir)/primary-issuance-one-time-offer-interface.dar
primary_issuance_one_time_offer_dar = $(build_dir)/primary-issuance-one-time-offer.dar
pbt_dar = $(build_dir)/pbt.dar
pbt_interface_dar = $(build_dir)/pbt-interface.dar
wallet_views_types_dar = $(build_dir)/daml-wallet-views-types.dar

# Codegen outputs
wallet_views_main_codegen = wallet-views/java/src/generated-main/java
wallet_views_test_codegen = wallet-views/java/src/generated-test/java
wallet_views_client_codegen = wallet-views/typescript-client/daml.js
wallet_ui_codegen = wallet-ui/daml.js

# npm outputs
wallet_views_typescript_client_build = wallet-views/typescript-client/lib

# Conf file is used to configure dependencies on Daml Finance
# It has been copied from https://github.com/digital-asset/daml-finance/blob/8a4b826a683364f06f6dd1068a3d2f15f03ff6e6/docs/code-samples/tutorials-config/0.0.3.conf
$(daml_finance_dir): dependencies.conf
	./get-dependencies.sh

.PHONY: install-custom-views
install-custom-views:
	cd custom-views && \
	sbt 'set assembly / test := {}' 'set assembly / assemblyOutputPath := file("custom-views-assembly-LOCAL-SNAPSHOT.jar")' clean assembly && \
	mvn install:install-file \
		-Dfile=custom-views-assembly-LOCAL-SNAPSHOT.jar \
		-DgroupId=com.daml \
		-DartifactId=custom-views_2.13 \
		-Dversion=assembly-LOCAL-SNAPSHOT \
		-Dpackaging=jar \
		-DgeneratePom=true

$(util_dar): $(daml_finance_dir) $(shell ./find-daml-project-files.sh util/main)
	cd util/main && daml build -o $(proj_root)/$(util_dar)

$(trackable_holding_dar): $(daml_finance_dir) $(shell ./find-daml-project-files.sh trackable-holding/main)
	cd trackable-holding/main && daml build -o $(proj_root)/$(trackable_holding_dar)

$(trackable_settlement_dar): $(daml_finance_dir) $(shell ./find-daml-project-files.sh trackable-settlement/main)
	cd trackable-settlement/main && daml build -o $(proj_root)/$(trackable_settlement_dar)

## BEGIN mint
# $(primary_issuance_one_time_offer_interface_dar): $(daml_finance_dir) \
#   $(shell ./find-daml-project-files.sh primary-issuance/one-time-offer-interface)
# 	cd primary-issuance/one-time-offer-interface && daml build -o $(proj_root)/$(primary_issuance_one_time_offer_interface_dar)

# $(primary_issuance_one_time_offer_dar): $(primary_issuance_one_time_offer_interface_dar) \
#   $(shell ./find-daml-project-files.sh primary-issuance/one-time-offer-implementation)
# 	cd primary-issuance/one-time-offer-implementation && daml build -o $(proj_root)/$(primary_issuance_one_time_offer_dar)

.build/daml-mint.dar: $(daml_finance_dir) $(util_dar) $(shell ./find-daml-project-files.sh mint/main)
	cd mint/main && daml build -o $(proj_root)/.build/daml-mint.dar

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
.build/fund-tokenization.dar: $(daml_finance_dir) $(util_dar) $(shell ./find-daml-project-files.sh fund/main)
	cd fund/main && daml build -o $(proj_root)/.build/fund-tokenization.dar

.PHONY: build-fund
build-fund: .build/fund-tokenization.dar

.PHONY: test-fund
test-fund: .build/fund-tokenization.dar
	cd fund/test && daml test
## END fund

## BEGIN onboarding
# Account
$(account_onboarding_one_time_offer_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh account-onboarding/one-time-offer-interface)
	cd account-onboarding/one-time-offer-interface && daml build -o $(proj_root)/$(account_onboarding_one_time_offer_interface_dar)

$(account_onboarding_one_time_offer_dar): $(account_onboarding_one_time_offer_interface_dar) \
  $(shell ./find-daml-project-files.sh account-onboarding/one-time-offer-implementation)
	cd account-onboarding/one-time-offer-implementation && daml build -o $(proj_root)/$(account_onboarding_one_time_offer_dar)

$(account_onboarding_open_offer_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh account-onboarding/open-offer-interface)
	cd account-onboarding/open-offer-interface && daml build -o $(proj_root)/$(account_onboarding_open_offer_interface_dar)

$(account_onboarding_open_offer_dar): $(account_onboarding_open_offer_interface_dar) \
  $(shell ./find-daml-project-files.sh account-onboarding/open-offer-implementation)
	cd account-onboarding/open-offer-implementation && daml build -o $(proj_root)/$(account_onboarding_open_offer_dar)

.PHONY: test-account-onboarding
test-account-onboarding: $(account_onboarding_open_offer_dar) $(util_dar)
	cd account-onboarding/test && daml test

# Issuer
$(issuer_onboarding_token_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh issuer-onboarding/instrument-token-interface)
	cd issuer-onboarding/instrument-token-interface && daml build -o $(proj_root)/$(issuer_onboarding_token_interface_dar)

$(issuer_onboarding_token_dar): $(issuer_onboarding_token_interface_dar) \
  $(util_dar) \
  $(shell ./find-daml-project-files.sh issuer-onboarding/instrument-token-implementation)
	cd issuer-onboarding/instrument-token-implementation && daml build -o $(proj_root)/$(issuer_onboarding_token_dar)

$(minter_burner_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh issuer-onboarding/minter-burner-interface)
	cd issuer-onboarding/minter-burner-interface && daml build -o $(proj_root)/$(minter_burner_interface_dar)

$(minter_burner_dar): $(minter_burner_interface_dar) \
  $(util_dar) \
  $(shell ./find-daml-project-files.sh issuer-onboarding/minter-burner-implementation)
	cd issuer-onboarding/minter-burner-implementation && daml build -o $(proj_root)/$(minter_burner_dar)

.PHONY: test-issuer-onboarding
test-issuer-onboarding: $(issuer_onboarding_token_dar) $(minter_burner_dar) $(util_dar)
	cd issuer-onboarding/test && daml test

# Scripts
$(onboarding_scripts_dar): $(daml_finance_dir) \
  $(account_onboarding_one_time_offer_dar) \
	$(account_onboarding_open_offer_dar) \
	$(issuer_onboarding_token_dar) \
  $(trackable_holding_dar) \
	$(trackable_settlement_dar) \
  .build/daml-mint.dar \
  .build/fund-tokenization.dar \
  $(pbt_dar) \
  $(shell ./find-daml-project-files.sh onboarding/main)
	cd onboarding/main && daml build -o $(proj_root)/$(onboarding_scripts_dar)

.PHONY: build-onboarding
build-onboarding: $(onboarding_scripts_dar)

.PHONY: install-onboarding
install-onboarding: $(onboarding_scripts_dar)
	export DOPS_DAR=$(proj_root)/$(onboarding_scripts_dar) && cd onboarding && ./install.sh
## END onboarding

## BEGIN pbt
$(pbt_interface_dar): $(daml_finance_dir) $(shell ./find-daml-project-files.sh pbt/interface)
	cd pbt/interface && daml build -o $(proj_root)/$(pbt_interface_dar)

$(pbt_dar): $(daml_finance_dir) $(pbt_interface_dar) $(shell ./find-daml-project-files.sh pbt/implementation)
	cd pbt/implementation && daml build -o $(proj_root)/$(pbt_dar)

.PHONY: build-pbt
build-pbt: $(pbt_dar)
## END pbt

## BEGIN wallet-views
$(wallet_views_types_dar): $(daml_finance_dir) \
  $(account_onboarding_open_offer_interface_dar) \
  $(issuer_onboarding_token_interface_dar) \
  $(pbt_interface_dar) \
  $(shell ./find-daml-project-files.sh wallet-views/types)
	cd wallet-views/types && daml build -o $(proj_root)/$(wallet_views_types_dar)

# Codegen - java
$(wallet_views_main_codegen): $(wallet_views_types_dar)
	rm -rf $(wallet_views_main_codegen)
	daml codegen java -o $(wallet_views_main_codegen) $(wallet_views_types_dar)

$(wallet_views_test_codegen): $(daml_finance_dir) \
  $(account_onboarding_open_offer_dar) \
  $(issuer_onboarding_token_dar) \
  $(pbt_dar)
	rm -rf $(wallet_views_test_codegen)
	daml codegen java \
		-o $(wallet_views_test_codegen) \
		$(daml_finance_dir)/daml-finance-account.dar \
		$(daml_finance_dir)/daml-finance-holding.dar \
		$(daml_finance_dir)/daml-finance-settlement.dar \
		$(daml_finance_dir)/daml-finance-instrument-token.dar \
		$(account_onboarding_open_offer_dar) \
		$(issuer_onboarding_token_dar) \
		$(pbt_dar)

.PHONY: compile-wallet-views
compile-wallet-views: $(wallet_views_main_codegen)
	cd wallet-views/java && mvn compile

.PHONY: build-wallet-views
build-wallet-views: $(wallet_views_main_codegen)
	cd wallet-views/java && mvn install -Dmaven.test.skip=true

.PHONY: test-wallet-views
test-wallet-views: $(wallet_views_main_codegen) $(wallet_views_test_codegen)
	cd wallet-views/java && mvn test ${TEST_WALLET_VIEWS_ARGS}

# Codegen - TypeScript
$(wallet_views_client_codegen): $(wallet_views_types_dar)
	rm -rf $(wallet_views_client_codegen)
	daml codegen js $(wallet_views_types_dar) -o $(wallet_views_client_codegen)

$(wallet_views_typescript_client_build): $(wallet_views_client_codegen) \
  $(shell ./find-ts-project-files.sh wallet-views/typescript-client)
	cd wallet-views/typescript-client && npm install && npm run build

.PHONY: build-wallet-views-client
build-wallet-views-client: $(wallet_views_typescript_client_build)

.PHONY: test-wallet-views-client
test-wallet-views-client: install-onboarding compile-wallet-views $(wallet_views_typescript_client_build)
	cd wallet-views/typescript-client && ./test.sh
## END wallet-views

## BEGIN wallet ui
$(wallet_ui_codegen): $(daml_finance_dir) \
  $(account_onboarding_open_offer_interface_dar) \
  .build/fund-tokenization.dar \
  .build/daml-mint.dar \
  $(pbt_interface_dar) 
	rm -rf $(wallet_ui_codegen)
	daml codegen js \
		$(account_onboarding_open_offer_interface_dar) \
		$(daml_finance_dir)/daml-finance-interface-util.dar \
		.build/fund-tokenization.dar \
		$(daml_finance_dir)/daml-finance-interface-holding.dar \
		.build/daml-mint.dar \
		$(pbt_interface_dar) -o $(wallet_ui_codegen)

.PHONY: build-wallet-ui
build-wallet-ui: $(wallet_ui_codegen) $(wallet_views_typescript_client_build) $(shell ./find-ts-project-files.sh wallet-ui)
	cd wallet-ui && npm install && npm run build

.PHONY: start-wallet-ui
start-wallet-ui: $(wallet_ui_codegen) $(wallet_views_typescript_client_build)
	cd wallet-ui && npm install && npm start
## END wallet ui

.PHONY: clean
clean:
	./clean-daml-projects.sh
	cd mint/java-example && mvn clean && rm -rf src/generated-main
	cd wallet-views/java && mvn clean
	rm -rf $(wallet_views_main_codegen) $(wallet_views_test_codegen)
	rm -rf $(wallet_views_client_codegen) wallet-views/typescript-client/node_modules $(wallet_views_typescript_client_build)
	rm -rf $(wallet_ui_codegen) wallet-ui/node_modules wallet-ui/build
	rm -rf $(build_dir)
	rm -rf $(daml_finance_dir)
