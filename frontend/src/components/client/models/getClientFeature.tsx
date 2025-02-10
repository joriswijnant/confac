import {Link} from 'react-router-dom';
import {IList, IListCell, ClientListFilters} from '../../controls/table/table-models';
import {Features, IFeature, IFeatureBuilderConfig} from '../../controls/feature/feature-models';
import {features} from '../../../trans';
import {ClientModel, ClientType, ClientTypes} from './ClientModels';
import {InvoiceWorkedDays} from '../../invoice/invoice-list/InvoiceWorkedDays';
import InvoiceModel from '../../invoice/models/InvoiceModel';
import {InvoicesSummary} from '../../invoice/controls/InvoicesSummary';
import {DeleteIcon} from '../../controls/icons/DeleteIcon';
import {t} from '../../utils';
import {searchClientForList} from './searchClientFor';
import {getInvoiceYears} from '../../invoice/models/InvoiceListModel';
import {ClientEditIcon} from '../controls/ClientEditIcon';
import {Claim} from '../../users/models/UserModel';
import { ClientSearch, ClientFilterOption } from '../controls/ClientSearch';


export type ClientFeatureBuilderConfig = IFeatureBuilderConfig<ClientModel, ClientListFilters> & {
  invoices: InvoiceModel[];
};

const getFilteredClients = (config: ClientFeatureBuilderConfig): ClientModel[] =>
{
  let clients = config.data;
  if(clients.length === 0) return clients;

  if(config.filters.types.length > 0){

    clients = clients.filter(client => {
      if(!Array.isArray(client.type)) return false; // @debugging
      
      return config.filters.types.every(type => client.type.includes(type))
    })
  }

  if(clients.length === 0) return clients;


  if(config.filters.years.length > 0)
  {
    clients = clients.filter(client => {
      let invoices = config.invoices.filter(i => i.client._id === client._id)
      let years = getInvoiceYears(invoices);

      return config.filters.years.every(year => years.includes(year))
    })
  }

  return clients;
}

const clientListConfig = (config: ClientFeatureBuilderConfig): IList<ClientModel, ClientListFilters> => {
  const cells: IListCell<ClientModel>[] = [{
    key: 'name',
    header: 'client.name',
    value: client => (
      <>
        <Link to={`/clients/${client.slug}`}>
          <strong>{client.name}</strong>
        </Link>
        <br />
        <span>{client.btw}</span>
      </>
    ),
    sort: (c1, c2) => c1.name.localeCompare(c2.name)
  }, {
    key: 'type',
    header: 'client.type',
    value: client => {
    let temp = (
      <>
      { client.type && client.type.map(type => (<><span>{type}</span><br /></>)) }
      </>
    )

     return temp
    }
  }, {
    key: 'contact',
    header: 'client.contact',
    value: client => (
      <>
        <span>{client.address}</span>
        <br />
        <span>{client.postalCode} {client.city}</span>
        <br />
        <span>{client.telephone}</span>
      </>
    ),
    sort: (c1, c2) => c1.address.localeCompare(c2.address)
  }, {
    key: 'time-invested',
    header: 'client.timeTitle',
    value: client => {
      let clientInvoices = config.invoices.filter(i => i.client._id === client._id);
      if (config.filters.years && config.filters.years.length) {
        clientInvoices = clientInvoices.filter(i => config.filters.years.includes(i.date.year()));
      }
      return <InvoiceWorkedDays invoices={clientInvoices} display="client" />;
    },
  }, {
    key: 'invoices',
    header: 'invoice.amount',
    value: client => {
      let clientInvoices = config.invoices.filter(i => i.client._id === client._id);
      if (config.filters.years && config.filters.years.length) {
        clientInvoices = clientInvoices.filter(i => config.filters.years.includes(i.date.year()));
      }
      return <InvoicesSummary invoices={clientInvoices} />;
    },
  }, {
    key: 'buttons',
    header: '',
    className: 'icons-cell',
    value: client => (
      <>
        <ClientEditIcon client={client} />
        <DeleteIcon
          claim={Claim.ManageClients}
          onClick={() => config.save({...client, active: !client.active}, true)}
          title={client.active ? t('client.deactivateTitle') : t('client.activateTitle')}
        />
      </>
    ),
  }];

  return {
    rows: {
      className: client => (client.active ? undefined : 'table-danger'),
      cells,
    },
    data: getFilteredClients(config),
    sorter: (a, b) => a.name.localeCompare(b.name),
  };
};

const createFilterByDescription = (filters :string[]) =>
{
 let newFilter: ClientListFilters = {
  years: [],
  types: []
 } ;
 
  filters.forEach(f => {
    if(ClientTypes.includes(f as ClientType)){
      newFilter.types.push(f as ClientType);
    }

    const yearFilter = f.match(/(\d{4})/);
    if (yearFilter) {
      const year = Number(yearFilter[1]);
      newFilter.years.push(year);
    }

  });

  return newFilter;
};


const getFilterOptions = (config: ClientFeatureBuilderConfig): ClientFilterOption[] => {
  let options: ClientFilterOption[] = [
    {value: 'partner', label: t('client.types.partner')},
    {value: 'client', label: t('client.types.client')},
    {value: 'endcustomer', label: t('client.types.endcustomer')},
  ];

  let years: number[] = getInvoiceYears(config.invoices);
  options = options.concat(years.map(y =>  {return {value: y.toString(), label: y.toString()}}));
  return options
}

export const clientFeature = (config: ClientFeatureBuilderConfig): IFeature<ClientModel, ClientListFilters> => {
  const feature: IFeature<ClientModel, ClientListFilters> = {
    key: Features.clients,
    nav: m => `/clients/${m === 'create' ? m : m.slug}`,
    trans: features.client as any,
    list: clientListConfig(config),
  };
  
  let values = config.filters.types.map(f => f.toString()).concat(config.filters.years.map(y => y.toString()))


  feature.list.filter = {
    state: config.filters,
    updateFilter: config.setFilters,
    fullTextSearch: searchClientForList,
    softDelete: true,
    extras: () => (
      <ClientSearch
        values={values}
        options={getFilterOptions(config)}
        onChange={values => config.setFilters(createFilterByDescription(values))}
      />
    ),
  };

  return feature;
};


