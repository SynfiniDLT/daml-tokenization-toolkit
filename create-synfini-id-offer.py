#!/usr/bin/env python3

import argparse
import sys
import hashlib
import uuid
import json
import subprocess
import tempfile
from datetime import datetime

parser = argparse.ArgumentParser(
  description='Create identity token by creating the instrument and metadata contracts. In addition a settlement offer contract will be created to allow the intended owner to acquire ownership of the token'
)
parser.add_argument('--issuer', dest='issuer', help='Label of the issuer party')
parser.add_argument('--depository', dest='depository', help='Label of the depository party')
parser.add_argument('--custodian', dest='custodian', help='Label of the custodian party for the Holding of the token')
parser.add_argument('--issuer-contract', dest='issuer_contract', help='Label of the Issuer contract')
parser.add_argument('--publisher-contract', dest='publisher_contract', help='Label of the issuer\'s Publisher contract')
parser.add_argument('--offer-id', dest='offer_id', help='Identifier of the settlement offer contract that will be created')
parser.add_argument('--owner', dest='owner', help='Label of the party which will be offered the identity token')
parser.add_argument('--name', dest='name', help='Name assigned to the party by the token')
parser.add_argument('--observers', dest='observers', default='', help='Comma-delimited labels of the observers of the token Instrument and Metadata contracts')
parser.add_argument('--settlement-open-offer-factory', dest='settlement_open_offer_factory', help='Label of the settlement open offer factory contract')
parser.add_argument('--settlement-factory', dest='settlement_factory', help='Label of the settlement factory contract used on the offer')
parser.add_argument('--route-provider', dest='route_provider', help='Label of the route provider contract')
parser.add_argument('--read-as', dest='read_as', default='', help='Comma-delimited labels of the parties used to read contracts from the ledger')
args = parser.parse_args()

def truncated_uuid():
  return f'{uuid.uuid4().int & ((1<<48) - 1):012x}'

def dops(command, input_json, *args):
  with tempfile.NamedTemporaryFile(mode='w+') as tmp:
    json.dump(input_json, tmp)
    tmp.flush()
    res = subprocess.run(['dops', command, tmp.name] + list(args)).returncode
    if res != 0:
      raise Exception('Non-zero exit code')

observers = args.observers.split(',')
instrument = {
  'issuer': args.issuer_contract,
  'id': 'Synfini ID',
  'description': 'Identifier of Synfini ecosystem member',
  'validAsOf': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f') + 'Z',
  'observers': [
    {
      'context': 'setup',
      'parties': observers + [args.owner]
    }
  ],
  'metadata': {
    'publisher': args.publisher_contract,
    'attributes': [
      {
        'attributeName': 'Name',
        'attributeValue': args.name,
        'displayType': 'string'
      },
      {
        'attributeName': 'Issuance ID',
        'attributeValue': truncated_uuid(),
        'displayType': 'string'
      }
    ],
    'disclosureControllers': [args.owner, args.issuer, args.depository],
    'observers': [
      {
        'context': 'setup',
        'parties': observers
      }
    ]
  }
}

def hash_utf8(string):
  h = hashlib.sha256()
  h.update(string.encode('utf-8'))
  return h.digest()

def compute_instrument_version():
  hashes = []
  hashes.append(hash_utf8(instrument['description']))
  hashes.append(hash_utf8(instrument['validAsOf']))

  attribute_hashes = []

  for attribute in instrument['metadata']['attributes']:
    attribute_hash = hashlib.sha256()
    attribute_hash.update(hash_utf8(attribute['attributeName']))
    attribute_hash.update(hash_utf8(attribute['attributeValue']))
    attribute_hash.update(hash_utf8(attribute['displayType']))

    attribute_hashes.append(attribute_hash.digest())

  attribute_hashes.sort()
  hash_all_attributes = hashlib.sha256()
  for h in attribute_hashes:
    hash_all_attributes.update(h)
  hashes.append(hash_all_attributes.digest())

  version_hash = hashlib.sha256()
  for h in hashes:
    version_hash.update(h)

  return version_hash.hexdigest()

instrument['version'] = compute_instrument_version()[-12:]

read_as = args.read_as.split(',')
create_instrument_json = {
  'readAs': read_as,
  'instrumentSettings': [instrument]
}

dops('create-instruments', create_instrument_json)

# TODO: this should be implemented as a one-time offer, not an open offer
settlement_offer = {
  'readAs': read_as,
  'settlementOpenOfferSettings': [
    {
      'offerId': args.offer_id,
      'offerers': [args.issuer],
      'offerDescription': 'Receive Synfini ID token',
      'settlementInstructors': [{'party': args.issuer}, {'taker': {}}],
      'settlers': [{'party': args.issuer}],
      'steps': [
        {
          'sender': {'party': args.custodian},
          'receiver': {'taker': {}},
          'instrumentDepository': args.depository,
          'instrumentIssuer': args.issuer,
          'instrumentId': instrument['id'],
          'instrumentVersion': instrument['version'],
          'amount': 1
        }
      ],
      'minQuantity': 1,
      'maxQuantity': 1,
      'settlementOpenOfferFactory': args.settlement_open_offer_factory,
      'routeProvider': args.route_provider,
      'settlementFactory': args.settlement_factory,
      'permittedTakers': [args.owner],
      'observers' : [{
        'context': 'setup',
        'parties': [args.owner]
      }]
    }
  ]
}

dops('create-settlement-open-offers', settlement_offer)
