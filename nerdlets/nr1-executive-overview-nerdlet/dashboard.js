import React from 'react';
import PropTypes from 'prop-types';
import { NerdGraphQuery, AccountStorageMutation, Toast } from 'nr1';
import { Table, Radio, Input, Button, Form } from 'semantic-ui-react';
const gqlQuery = require('./query');

export default class Dashboard extends React.Component {

  static propTypes = {
    selectedAccount: PropTypes.number,
    onDashRefresh: PropTypes.func
  }

  constructor(props){
      super(props)
      this.state = {
        selectedGuid: null,
        selectedName: null,
        searchedDashboards: [],
        searchText: '',
        loading: false
      }
  }

  async componentDidMount() {
    this.setState({ loading: true })
    await this.fetchDashboards();
  }

  async fetchDashboards(){
    let { searchedDashboards } = this.state;

    let dashboards = await NerdGraphQuery.query({query: gqlQuery.dashboards(this.props.selectedAccount)})
    const dashboardResults = ((((dashboards || {}).data || {}).actor || {}).entitySearch || {}).results || {};

    searchedDashboards = [
      ...searchedDashboards,
      ...dashboardResults.entities
    ];

    this.setState({ searchedDashboards, loading: false });
  }

  saveDashboard() {
    AccountStorageMutation.mutate({
      accountId: this.props.selectedAccount,
      actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'AccountDashboards',
      documentId: "Dashboard",
      document: {
        "guid": this.state.selectedGuid,
        "name": this.state.selectedName,
        "account": this.props.selectedAccount
      }
    }).then(({ data }) => {
      Toast.showToast({title: "Dashboard Saved!", type: Toast.TYPE.Normal });
    }).catch(error => {
      console.debug(error);
      Toast.showToast({title: error.message, type: Toast.TYPE.CRITICAL });
    })
    this.props.onDashRefresh()
  }

  render() {
    const { selectedGuid, searchedDashboards, searchText, loading } = this.state;

    if (searchedDashboards.length == 0 && !loading) {
      return (
        <p> No dashboards created in account - {this.props.selectedAccount} </p>
      )
    } else {
      return (
      <>
      <Input icon='search' placeholder='Search...' onChange={e => this.setState({ searchText: e.target.value })}/>
      <div
        style={{
          overflowY: 'scroll',
          height: '300px',
          display: searchedDashboards.length === 0 ? 'none' : ''
        }}
      >
      <Table compact small celled>
        <Table.Body>
          {searchedDashboards.filter(dash =>
            dash.name ? dash.name.toLowerCase().includes(searchText.toLowerCase()) : false
            )
            .map((dash, i) => {
              return (
                <Table.Row key={i}>
                  <Table.Cell>{dash.name}</Table.Cell>
                  <Table.Cell>
                    <Radio
                      key={dash.name}
                      value={dash.guid}
                      checked={selectedGuid === dash.guid}
                      onChange={() => this.setState({ selectedGuid: dash.guid, selectedName: dash.name })}
                    />
                  </Table.Cell>
                </Table.Row>
              )
            })
          }
        </Table.Body>
      </Table>
      </div>
      <br />
      <Button
        style={{ float: 'right' }}
        disabled={!selectedGuid}
        positive
        onClick={() => {
          this.saveDashboard();
        }}
      >
      Save
      </Button>
      <br />
    </>
  );
    }
  }
}
