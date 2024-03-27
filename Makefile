proj_root = $(shell pwd)

# Dar dependencies
daml_finance_dir = .lib

# Daml models directory
models_src_dir = models

# Wallet views directory
wallet_views_dir = wallet-views
wallet_views_types_dir = $(wallet_views_dir)/types
wallet_views_ts_client_dir = $(wallet_views_dir)/typescript-client
wallet_views_ts_client_package_json = $(wallet_views_ts_client_dir)/package.json

# Wallet UI directory
wallet_ui_dir = wallet-ui
wallet_ui_package_json = $(wallet_ui_dir)/package.json

# Dar build outputs
build_dir = .build
assert_dar = $(build_dir)/synfini-assert.dar
trackable_holding_dar = $(build_dir)/synfini-trackable-holding.dar
trackable_settlement_dar = $(build_dir)/synfini-trackable-settlement.dar
account_onboarding_one_time_offer_interface_dar = $(build_dir)/synfini-account-onboarding-one-time-offer-interface.dar
account_onboarding_one_time_offer_dar = $(build_dir)/synfini-account-onboarding-one-time-offer.dar
account_onboarding_open_offer_interface_dar = $(build_dir)/synfini-account-onboarding-open-offer-interface.dar
account_onboarding_open_offer_dar = $(build_dir)/synfini-account-onboarding-open-offer.dar
issuer_onboarding_token_interface_dar = $(build_dir)/synfini-issuer-onboarding-token-interface.dar
issuer_onboarding_token_dar = $(build_dir)/synfini-issuer-onboarding-token.dar
operations_scripts_dar = $(build_dir)/synfini-operations.dar
minter_burner_interface_dar = $(build_dir)/synfini-issuer-onboarding-minter-burner-interface.dar
minter_burner_dar = $(build_dir)/synfini-issuer-onboarding-minter-burner.dar
settlement_one_time_offer_interface_dar = $(build_dir)/synfini-settlement-one-time-offer-interface.dar
settlement_one_time_offer_dar = $(build_dir)/synfini-settlement-one-time-offer.dar
settlement_open_offer_interface_dar = $(build_dir)/synfini-settlement-open-offer-interface.dar
settlement_open_offer_dar = $(build_dir)/synfini-settlement-open-offer.dar
settlement_helpers_dar = $(build_dir)/synfini-settlement-helpers.dar
pbt_dar = $(build_dir)/synfini-pbt.dar
pbt_interface_dar = $(build_dir)/synfini-pbt-interface.dar
wallet_views_types_dar = $(build_dir)/synfini-wallet-views-types.dar

# Codegen outputs
wallet_views_main_codegen = $(wallet_views_dir)/java/src/generated-main/java
wallet_views_test_codegen = $(wallet_views_dir)/java/src/generated-test/java
wallet_views_client_codegen = $(wallet_views_dir)/typescript-client/daml.js
wallet_ui_codegen = $(wallet_ui_dir)/daml.js

# npm outputs
wallet_views_ts_client_node_modules = $(wallet_views_ts_client_dir)/node_modules
wallet_views_ts_client_build = $(wallet_views_ts_client_dir)/lib
wallet_ui_node_modules = $(wallet_ui_dir)/node_modules

# Conf file is used to configure dependencies on Daml Finance
# It has been copied from https://github.com/digital-asset/daml-finance/blob/8a4b826a683364f06f6dd1068a3d2f15f03ff6e6/docs/code-samples/tutorials-config/0.0.3.conf
$(daml_finance_dir): dependencies.conf
	./get-dependencies.sh

CUSTOM_VIEWS_JAR = $(proj_root)/$(build_dir)/custom-views-assembly-LOCAL-SNAPSHOT.jar
.PHONY: install-custom-views
install-custom-views:
	cd custom-views && \
	sbt 'set assembly / test := {}' 'set assembly / assemblyOutputPath := file("${CUSTOM_VIEWS_JAR}")' clean assembly && \
	mvn install:install-file \
		-Dfile=${CUSTOM_VIEWS_JAR} \
		-DgroupId=com.daml \
		-DartifactId=custom-views_2.13 \
		-Dversion=assembly-LOCAL-SNAPSHOT \
		-Dpackaging=jar \
		-DgeneratePom=true

$(assert_dar): $(shell ./find-daml-project-files.sh $(models_src_dir)/util/assert)
	cd $(models_src_dir)/util/assert && daml build -o $(proj_root)/$(assert_dar)

$(trackable_holding_dar): $(daml_finance_dir) $(shell ./find-daml-project-files.sh $(models_src_dir)/trackable-holding/main)
	cd $(models_src_dir)/trackable-holding/main && daml build -o $(proj_root)/$(trackable_holding_dar)

$(trackable_settlement_dar): $(daml_finance_dir) $(shell ./find-daml-project-files.sh $(models_src_dir)/trackable-settlement/main)
	cd $(models_src_dir)/trackable-settlement/main && daml build -o $(proj_root)/$(trackable_settlement_dar)

## BEGIN settlement
$(settlement_one_time_offer_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/settlement/one-time-offer-interface)
	cd $(models_src_dir)/settlement/one-time-offer-interface && daml build -o $(proj_root)/$(settlement_one_time_offer_interface_dar)

$(settlement_one_time_offer_dar): $(settlement_one_time_offer_interface_dar) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/settlement/one-time-offer-implementation)
	cd $(models_src_dir)/settlement/one-time-offer-implementation && daml build -o $(proj_root)/$(settlement_one_time_offer_dar)

$(settlement_open_offer_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/settlement/open-offer-interface)
	cd $(models_src_dir)/settlement/open-offer-interface && daml build -o $(proj_root)/$(settlement_open_offer_interface_dar)

$(settlement_open_offer_dar): $(settlement_open_offer_interface_dar) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/settlement/open-offer-implementation)
	cd $(models_src_dir)/settlement/open-offer-implementation && daml build -o $(proj_root)/$(settlement_open_offer_dar)

$(settlement_helpers_dar): $(settlement_one_time_offer_interface_dar) \
  $(minter_burner_interface_dar) \
  $(assert_dar) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/settlement/helpers)
	cd $(models_src_dir)/settlement/helpers && daml build -o $(proj_root)/$(settlement_helpers_dar)

.PHONY: test-settlement
test-settlement: $(settlement_one_time_offer_dar) $(assert_dar)
	cd $(models_src_dir)/settlement/test && daml test
## END settlement

## BEGIN onboarding
# Account
$(account_onboarding_one_time_offer_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/account-onboarding/one-time-offer-interface)
	cd $(models_src_dir)/account-onboarding/one-time-offer-interface && daml build -o $(proj_root)/$(account_onboarding_one_time_offer_interface_dar)

$(account_onboarding_one_time_offer_dar): $(account_onboarding_one_time_offer_interface_dar) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/account-onboarding/one-time-offer-implementation)
	cd $(models_src_dir)/account-onboarding/one-time-offer-implementation && daml build -o $(proj_root)/$(account_onboarding_one_time_offer_dar)

$(account_onboarding_open_offer_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/account-onboarding/open-offer-interface)
	cd $(models_src_dir)/account-onboarding/open-offer-interface && daml build -o $(proj_root)/$(account_onboarding_open_offer_interface_dar)

$(account_onboarding_open_offer_dar): $(account_onboarding_open_offer_interface_dar) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/account-onboarding/open-offer-implementation)
	cd $(models_src_dir)/account-onboarding/open-offer-implementation && daml build -o $(proj_root)/$(account_onboarding_open_offer_dar)

.PHONY: test-account-onboarding
test-account-onboarding: $(account_onboarding_open_offer_dar) $(assert_dar)
	cd $(models_src_dir)/account-onboarding/test && daml test

# Issuer
$(issuer_onboarding_token_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/issuer-onboarding/instrument-token-interface)
	cd $(models_src_dir)/issuer-onboarding/instrument-token-interface && daml build -o $(proj_root)/$(issuer_onboarding_token_interface_dar)

$(issuer_onboarding_token_dar): $(issuer_onboarding_token_interface_dar) \
  $(assert_dar) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/issuer-onboarding/instrument-token-implementation)
	cd $(models_src_dir)/issuer-onboarding/instrument-token-implementation && daml build -o $(proj_root)/$(issuer_onboarding_token_dar)

$(minter_burner_interface_dar): $(daml_finance_dir) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/issuer-onboarding/minter-burner-interface)
	cd $(models_src_dir)/issuer-onboarding/minter-burner-interface && daml build -o $(proj_root)/$(minter_burner_interface_dar)

$(minter_burner_dar): $(minter_burner_interface_dar) \
  $(assert_dar) \
  $(shell ./find-daml-project-files.sh $(models_src_dir)/issuer-onboarding/minter-burner-implementation)
	cd $(models_src_dir)/issuer-onboarding/minter-burner-implementation && daml build -o $(proj_root)/$(minter_burner_dar)

.PHONY: test-issuer-onboarding
test-issuer-onboarding: $(issuer_onboarding_token_dar) $(minter_burner_dar) $(assert_dar)
	cd $(models_src_dir)/issuer-onboarding/test && daml test

# Scripts
$(operations_scripts_dar): $(daml_finance_dir) \
  $(account_onboarding_one_time_offer_dar) \
  $(account_onboarding_open_offer_dar) \
  $(issuer_onboarding_token_dar) \
  $(minter_burner_dar) \
  $(settlement_one_time_offer_dar) \
  $(settlement_open_offer_dar) \
  $(settlement_helpers_dar) \
  $(trackable_holding_dar) \
  $(trackable_settlement_dar) \
  $(pbt_dar) \
  $(shell ./find-daml-project-files.sh operations/main)
	cd operations/main && daml build -o $(proj_root)/$(operations_scripts_dar)

.PHONY: install-operations
install-operations: $(operations_scripts_dar)
	export DOPS_DAR=$(proj_root)/$(operations_scripts_dar) && cd operations && ./install.sh
## END onboarding

## BEGIN pbt
$(pbt_interface_dar): $(daml_finance_dir) $(shell ./find-daml-project-files.sh $(models_src_dir)/pbt/interface)
	cd $(models_src_dir)/pbt/interface && daml build -o $(proj_root)/$(pbt_interface_dar)

$(pbt_dar): $(daml_finance_dir) $(pbt_interface_dar) $(shell ./find-daml-project-files.sh $(models_src_dir)/pbt/implementation)
	cd $(models_src_dir)/pbt/implementation && daml build -o $(proj_root)/$(pbt_dar)
## END pbt

## BEGIN wallet-views
$(wallet_views_types_dar): $(daml_finance_dir) \
  $(account_onboarding_open_offer_interface_dar) \
  $(issuer_onboarding_token_interface_dar) \
  $(pbt_interface_dar) \
  $(shell ./find-daml-project-files.sh $(wallet_views_types_dir))
	cd $(wallet_views_types_dir) && daml build -o $(proj_root)/$(wallet_views_types_dar)

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
$(wallet_views_client_codegen): $(wallet_views_ts_client_package_json) \
  $(wallet_views_types_dar)
	rm -rf $(wallet_views_client_codegen)
	daml codegen js $(wallet_views_types_dar) -o $(wallet_views_client_codegen)

# TypeScript client
$(wallet_views_ts_client_node_modules): $(wallet_views_ts_client_package_json) $(wallet_views_client_codegen)
	cd $(wallet_views_ts_client_dir) && npm install

$(wallet_views_ts_client_build): $(wallet_views_ts_client_node_modules) \
  $(shell ./find-ts-project-files.sh $(wallet_views_ts_client_dir))
	cd $(wallet_views_ts_client_dir) && npm run build

.PHONY: build-wallet-views-ts-client
build-wallet-views-ts-client: $(wallet_views_ts_client_build)

.PHONY: test-wallet-views-ts-client
test-wallet-views-ts-client: install-operations compile-wallet-views $(wallet_views_ts_client_build)
	cd $(wallet_views_ts_client_dir) && ./test.sh
## END wallet-views

## BEGIN wallet ui
$(wallet_ui_codegen): $(wallet_ui_package_json) \
  $(daml_finance_dir) \
  $(account_onboarding_open_offer_interface_dar) \
  $(issuer_onboarding_token_interface_dar) \
  $(minter_burner_interface_dar) \
  $(settlement_one_time_offer_interface_dar) \
  $(settlement_open_offer_interface_dar) \
  $(settlement_helpers_dar) \
  $(pbt_interface_dar)
	rm -rf $(wallet_ui_codegen)
	daml codegen js \
		$(account_onboarding_open_offer_interface_dar) \
		$(issuer_onboarding_token_interface_dar) \
		$(minter_burner_interface_dar) \
		$(settlement_one_time_offer_interface_dar) \
		$(settlement_open_offer_interface_dar) \
		$(settlement_helpers_dar) \
		$(daml_finance_dir)/daml-finance-interface-types-common.dar \
		$(daml_finance_dir)/daml-finance-interface-util.dar \
		$(daml_finance_dir)/daml-finance-interface-holding.dar \
		$(daml_finance_dir)/daml-finance-interface-settlement.dar \
		$(pbt_interface_dar) -o $(wallet_ui_codegen)

$(wallet_ui_node_modules): $(wallet_ui_codegen) $(wallet_ui_package_json)
	cd $(wallet_ui_dir) && npm install

.PHONY: build-wallet-ui
build-wallet-ui: $(wallet_ui_node_modules) $(wallet_views_ts_client_build)
	cd $(wallet_ui_dir) && npm run build

.PHONY: start-wallet-ui
start-wallet-ui: $(wallet_ui_node_modules) $(wallet_views_ts_client_build)
	cd $(wallet_ui_dir) && npm start
## END wallet ui

.PHONY: clean
clean:
	./clean-daml-projects.sh
	cd wallet-views/java && mvn clean
	rm -rf $(wallet_views_main_codegen) $(wallet_views_test_codegen)
	rm -rf $(wallet_views_client_codegen) $(wallet_views_ts_client_node_modules) $(wallet_views_ts_client_build)
	rm -rf $(wallet_ui_codegen) $(wallet_ui_node_modules) $(wallet_ui_dir)/build
	rm -rf $(build_dir)
	rm -rf $(daml_finance_dir)
