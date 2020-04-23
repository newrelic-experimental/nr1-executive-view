import React from 'react'
import PropTypes from 'prop-types'
import { Button, Card, Icon, Loader, Modal, Popup, Label, Statistic, Table, Tab, Segment, Dropdown, Form, Input, Menu, Header } from 'semantic-ui-react'
import { UserStorageQuery, UserStorageMutation, NerdGraphQuery, AccountStorageQuery, Spinner, Link, Tooltip, navigation } from 'nr1';
import Tags from './tags';
import TagDropdown from './tag-dropdown';
import Dashboard from './dashboard';
import _ from 'lodash';
const gqlQuery = require('./query');

export default class MyNerdlet extends React.Component {

    constructor(props){
        super(props)
        this.state = {
            accounts: [],
            accountData: {},
            column: null,
            direction: null,
            useStrict: false,
            retrievedTags: [],
            retrievedDashboards: [],
            currentFilters: [],
            filteredIds: [],
            addDashboard: false,
            selectedAcct: 0,
            tagsLoaded: false,
            tagDrops: null
        }
    }

    async componentDidMount(){
      await this.fetchNewRelicData();
    }

    async fetchNewRelicData(){
        let results = await NerdGraphQuery.query({query: gqlQuery.getAccounts()})

        if(results.errors){
            console.log(results.errors)
        }else {
            let accounts = [];
            results.data.actor.accounts.forEach(acct => {
              accounts.push(acct);
            })
            this.setState({
              accounts: accounts
            }, async () => {
              //console.log(JSON.stringify(accounts, 0,2))
              let accountData = {};
              let existingTags = await this.retrieveTags();
              let existingDashboards = await this.retrieveDashboards();
              accounts.forEach((account) => {
                  let applications = NerdGraphQuery.query({query: gqlQuery.agentList(account.id, "APM")})
                  let browserApplications = NerdGraphQuery.query({query: gqlQuery.browseragentList(account.id, "BROWSER")})
                  let mobileApplications = NerdGraphQuery.query({query: gqlQuery.mobileagentList(account.id, "MOBILE")})
                  let infraHosts = NerdGraphQuery.query({query: gqlQuery.hostagentList(account.id, "INFRA")})
                  let synMonitors = NerdGraphQuery.query({query: gqlQuery.synagentList(account.id, "SYNTH")})

                  Promise.all([applications, browserApplications, mobileApplications, infraHosts, synMonitors]).then((values) => {
                      accountData[account.id] = {
                          "applications": this.processAgentList(values[0]),
                          "browser": this.processAgentList(values[1]),
                          "mobile": this.processAgentList(values[2]),
                          "hosts": this.processAgentList(values[3]),
                          "synthetics": this.processAgentList(values[4])
                      }

                      let divideBy = 0
                      let healthScore = 0
                      if(accountData[account.id]["applications"]["HEALTH_SCORE"] !== "N/A"){
                          divideBy++
                          healthScore += accountData[account.id]["applications"]["HEALTH_SCORE"]
                      }
                      if(accountData[account.id]["browser"]["HEALTH_SCORE"] !== "N/A"){
                          divideBy++
                          healthScore += accountData[account.id]["browser"]["HEALTH_SCORE"]
                      }
                      if(accountData[account.id]["mobile"]["HEALTH_SCORE"] !== "N/A"){
                          divideBy++
                          healthScore += accountData[account.id]["mobile"]["HEALTH_SCORE"]
                      }
                      if(accountData[account.id]["hosts"]["HEALTH_SCORE"] !== "N/A"){
                          divideBy++
                          healthScore += accountData[account.id]["hosts"]["HEALTH_SCORE"]
                      }
                      if(accountData[account.id]["synthetics"]["HEALTH_SCORE"] !== "N/A"){
                          divideBy++
                          healthScore += accountData[account.id]["synthetics"]["HEALTH_SCORE"]
                      }

                      //Alleviates the current bugs with entity searches
                      if (accountData[account.id]["mobile"]){
                        Object.keys(accountData[account.id]["mobile"]).forEach((item) => {
                          if (Array.isArray(accountData[account.id]["mobile"][item])) {
                            (accountData[account.id]["mobile"][item]).forEach((app, i) => {
                              if (app.mobileSummary == null) {
                                app.mobileSummary = {}
                              }
                            })
                          }
                        })
                      }

                      if (accountData[account.id]["applications"]) {
                        Object.keys(accountData[account.id]["applications"]).forEach((item) => {
                          if (Array.isArray(accountData[account.id]["applications"][item])) {
                            (accountData[account.id]["applications"][item]).forEach((app) => {
                              if (app.apmSummary == null) {
                                  app.apmSummary = {}
                              }
                            })
                          }
                        })
                      }

                      if (accountData[account.id]["browser"]) {
                        Object.keys(accountData[account.id]["browser"]).forEach((item) => {
                          if (Array.isArray(accountData[account.id]["browser"][item])) {
                            (accountData[account.id]["browser"][item]).forEach((app) => {
                              if (app.browserSummary == null) {
                                  app.browserSummary = {}
                              }
                            })
                          }
                        })
                      }

                      // Account Health Score - could be zero hence we do an additional check to avoid a NaN being returned during the calc
                      accountData[account.id]["HEALTH_SCORE"] = healthScore > 0 && divideBy > 0 ? healthScore / divideBy : "---"
                      accountData[account.id]["complete"] = true

                      this.setState({accountData: accountData, retrievedTags: existingTags, retrievedDashboards: existingDashboards, tagsLoaded: true })
                  })
               })
            })
        }
    }

    processAgentList(apps){
        let agents = (((((apps || {}).data || {}).actor || {}).entitySearch || {}).results || {}).entities || []

        let results = { "CRITICAL": 0, "WARNING": 0, "NOT_CONFIGURED": 0, "NOT_ALERTING": 0 ,
                        "alerting_entities": [], "non_alerting_entities": [], "non_configured_entities": [] }


        agents.forEach((agent, i) => {
          if (agent.apmSummary){
            delete agent.apmSummary['__typename'];
          } else if (agent.browserSummary) {
            delete agent.browserSummary['__typename'];
          } else if (agent.mobileSummary) {
            delete agent.mobileSummary['__typename'];
          } else if (agent.hostSummary) {
            delete agent.hostSummary['__typename'];
          } else if (agent.monitorSummary) {
            delete agent.monitorSummary['__typename'];
          }

          switch(agent.alertSeverity) {
            case "NOT_CONFIGURED":
              results["NOT_CONFIGURED"] ++;
              results["non_configured_entities"].push(agent);
              break;
            case "NOT_ALERTING":
              results["NOT_ALERTING"] ++;
              results["non_alerting_entities"].push(agent);
              break;
            case "CRITICAL":
              results["CRITICAL"] ++;
              results["alerting_entities"].push(agent);
              break;
            case "WARNING":
              results["WARNING"] ++;
              results["alerting_entities"].push(agent);
              break;
          }
        })

        // calculate score - Health Score = (Total alerts configured - alerts open) / Total alerts configured
        if (results["CRITICAL"] > 0 || results["WARNING"] > 0) {
            results["HEALTH_SCORE"] = (((results["NOT_ALERTING"] +results["CRITICAL"]) - results["CRITICAL"]) / (results["NOT_ALERTING"] + results["CRITICAL"]))
        }

        //100% health condition
        if (results["CRITICAL"] == 0 && results["WARNING"] == 0 && results["NOT_ALERTING"] > 0) {
          results["HEALTH_SCORE"] = 1
        }

        //no alerts configured at all
        if (results["NOT_CONFIGURED"] >= 0 && results["CRITICAL"] == 0 && results["WARNING"] == 0 && results["NOT_ALERTING"] == 0 ) {
          results["HEALTH_SCORE"] = "N/A"
        }

        //console.log(JSON.stringify(results,0,2))
        return results
    }

    handleDashClose = () => this.setState({ addDashboard: false })

    renderDashboardModal(){
        return (
          <div>
            <Modal size='large' open={this.state.addDashboard} onClose={this.handleDashClose}>
            <Modal.Header>Add New Dashboard</Modal.Header>
            <Modal.Content>
              Add a prebuilt dashboard link to account.
            </Modal.Content>
            <Modal.Content>
              <Dashboard selectedAccount={this.state.selectedAcct} onDashRefresh={this.handleDashRefresh} />
            </Modal.Content>
            </Modal>
          </div>
        )
    }

    handleTagRefresh = async () => {
      this.setState({tagsLoaded: false });
      let updatedTags = await this.retrieveTags();

      await this.setState({ retrievedTags: updatedTags }, () => {
        this.setState({ tagsLoaded: true })
      })
    }

    retrieveTags() {
      const { accounts } = this.state;

      return new Promise(async (resolve, reject) => {
        let tagArray = [];

        for (const acct of accounts) {
          let accountTags = await AccountStorageQuery.query({ accountId: acct.id, collection: 'AccountTags:' + acct.id.toString()});
          if (accountTags.data.length > 0) {
            for (let tags of accountTags.data) {
              let tagObj = {
                "account": acct.id,
                "key": tags.id,
                "value": tags.document.value
              }
              tagArray.push(tagObj)
            }
          }
        }
        resolve(tagArray);
      })
    }

    handleDashRefresh = async () => {
      let updatedDashboards = await this.retrieveDashboards();

      await this.setState({retrievedDashboards: updatedDashboards })
    }

    retrieveDashboards() {
      const { accounts } = this.state;

      return new Promise((resolve, reject) => {
        let dashArray = [];

        accounts.forEach((acct) => {
          AccountStorageQuery.query({
            accountId: acct.id,
            collection: 'AccountDashboards'
          }).then(({ data }) => {
            data.forEach((dash) => {
              let dashObj = {
                "guid": dash.document.guid,
                "name": dash.document.name,
                "accountId": dash.document.account
              };
              dashArray.push(dashObj)
            })
          })
          resolve(dashArray);
        })
      })
    }

    handleClear = e => {
      this.setState({ currentFilters: [], filteredIds: [] })
    }


    handleFilterChange(e, d) {
      const { accounts, currentFilters, retrievedTags } = this.state;
      let filterCopy = currentFilters;

      let keyFilter = d.placeholder;
      let valFilter = d.value;

      if (filterCopy && filterCopy.length > 0) { //if there are existing filters currently applied
        let tagToUpdate = filterCopy.find(f => keyFilter == f['key']);

        if (tagToUpdate !== undefined) { //update if filter currently set
          tagToUpdate['value'] = valFilter
        } else {
          filterCopy.push({"key": keyFilter, "value": valFilter}) //otherwise new filter, so add it
        }
      } else { //if no filters are currently applied (first filter applied)
        filterCopy.push({"key": keyFilter, "value": valFilter})
      }

      this.setState({
        currentFilters: filterCopy
      }, () => {
        let filteredIds = [];
        currentFilters.forEach(f => {
          retrievedTags.forEach(t => {
            if (t.value == f.value){
              filteredIds.push(t.account);
            }
          })
        })

        filteredIds = filteredIds.filter((a, b) => filteredIds.indexOf(a) === b);

        this.setState({
          filteredIds
        })
      })
    }

    renderProductModal(product, icon, score, count, alerts, type, accountId, accountName){
        return <Modal size="large" trigger={<Label color={this.setColor(score, alerts)} as="a" style={{width:"125px"}}>
                                <Icon name={icon} />{(count).toString().padStart(4, '0')} {product}
                            </Label>}>
                    <Modal.Header>{product} Score Card - {accountName}</Modal.Header>
                    <Modal.Content>
                        <Tooltip
                          text="Health Score = (Total alerts configured - alerts open) / Total alerts configured"
                          placementType={Tooltip.PLACEMENT_TYPE.LEFT}
                        >
                        <Icon size="large" name="help circle" />
                        </Tooltip>
                        Health Score: { score == 0 && alerts == 0 ? '---' : (score * 100).toFixed(2) + " %"} &nbsp;&nbsp;&nbsp;&nbsp;
                        Reporting: {count}
                    </Modal.Content>

                    <Modal.Content scrolling>
                        {this.renderProductModalTabs(accountId, type)}
                        <Modal.Description>
                            <p></p>
                        </Modal.Description>
                    </Modal.Content>
                </Modal>
    }

    renderProductModalTabs(accountId, type){
    let panes = []
    if(this.state.accountData[accountId] && this.state.accountData[accountId][type]){
        Object.keys(this.state.accountData[accountId][type]).forEach((item)=>{
            if(Array.isArray(this.state.accountData[accountId][type][item])) {
                if(this.state.accountData[accountId][type][item].length > 0){
                    let name = "";
                    switch(item) {
                      case "alerting_entities":
                        name = "Alerting"
                        break;
                      case "non_alerting_entities":
                        name = "Not Alerting"
                        break;
                      case "non_configured_entities":
                        name = "No Alerts Configured"
                        break;
                    }
                    let paneItem = { menuItem: name + ": " + this.state.accountData[accountId][type][item].length, render: () => <Tab.Pane attached={false}>{this.renderProductModalTable(this.state.accountData[accountId][type][item], item, type, accountId)}</Tab.Pane> }
                    panes.push(paneItem);
                }
            }
        })
    }

    // panes.push(panes.shift());
    return   <Tab menu={{ secondary: true, pointing: true }} panes={panes} />
  }

  getTableAccessor(type){
    let a = null;

    switch (type) {
      case "applications":
        a = "apmSummary"
        break;
      case "browser":
        a = "browserSummary"
        break;
      case "mobile":
        a = "mobileSummary"
        break;
      case "hosts":
        a = "hostSummary"
        break;
      case "synthetics":
        a = "monitorSummary"
        break;
    }
    return a;
  }

  renderProductModalTable(data, item, type, accountId){
      let accessor = this.getTableAccessor(type);

      return   <Table compact small celled>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell
              key={'name'}
              onClick={()=>{this.handleSort('name', item, type, accountId)}}>
              Name
          </Table.HeaderCell>
          {
            Object.keys(data[0][accessor]).map((summaryItem)=>{
            return <Table.HeaderCell key={summaryItem} onClick={()=>{this.handleSort(summaryItem, item, type, accountId)}}>{summaryItem}</Table.HeaderCell> //TODO: fix sort
          })}
        </Table.Row>
      </Table.Header>

      <Table.Body>
          {(data).map((i)=>{
              return <Table.Row key={i.guid}>
                        <Table.Cell><Link onClick={() => navigation.openStackedEntity(i.guid)}>{i.name}</Link></Table.Cell>
                        {Object.keys(i[accessor]).map((metric)=>{
                          let unit = this.getUnit(metric)
                          let value = i[accessor][metric];

                          if (value !== "" && value !== null){
                              value = value.toFixed(2)
                          }

                          if (type == "hosts" && value == null) {
                              value = 0
                          }

                          if (type == "synthetics" && value == null) {
                            value = "n/a"
                          } else if (type == "synthetics" && value !== null) {
                            value = (value*100)
                          }
                          return <Table.Cell key={metric}>{value + " " + unit}</Table.Cell>
                        })}
                    </Table.Row>
          })}
      </Table.Body>
    </Table>
  }

    getUnit(metricName){
      metricName = metricName.toLowerCase();

      if (metricName.includes("throughput")) {
        if (metricName.includes("page")){
          return 'PPM'
        } else {
          return 'RPM'
        }
      } else if (metricName.includes("rate") || metricName.includes("percent")) {
        return "%"
      } else if (metricName.includes("time")) {
        return "sec"
      } else {
        return ""
      }
    }

    renderCardHeader(a) {
      const { retrievedDashboards } = this.state;

      let dashFound = retrievedDashboards.filter(dash => dash.accountId === a.id);

      if (dashFound.length > 0) {
        return (
          <Popup
            hoverable
            position='top center'
            trigger={<Header as='a' color='blue' onClick={() => navigation.openStackedEntity(dashFound[0].guid)}>{a.name}</Header>}
            content={<Button onClick={() => this.setState({addDashboard: true, selectedAcct: a.id})} color='blue' size='small' icon='edit'/>}
            on='hover'
          />
        )
      } else {
        return (
          <Popup
            hoverable
            position='top center'
            trigger={<Header as='h4'>{a.name}</Header>}
            content={<Button onClick={() => this.setState({addDashboard: true, selectedAcct: a.id})} color='blue' size='small' icon='add'/>}
            on='hover'
          />
        )
      }
    }

    renderAccountCards(){
      const { accounts, filteredIds, retrievedDashboards } = this.state;

      return (
        <div style={{textAlign:"center"}}>
          <Card.Group style={{margin:"auto","width":"100%"}} centered>
          {filteredIds.length == 0 ?
            accounts.map((account, i) => {
              let horizon = this.state.accountData[account.id]

              let appsCount = horizon ? horizon.applications.CRITICAL + horizon.applications.WARNING + horizon.applications.NOT_CONFIGURED + horizon.applications.NOT_ALERTING : 0
              let appAlerts = horizon && horizon.applications.HEALTH_SCORE !== "N/A" ? 1 : 0
              let appsScore =  horizon && horizon.applications.HEALTH_SCORE !== "N/A" ? horizon.applications.HEALTH_SCORE : 0

              let hostsCount = horizon ? horizon.hosts.CRITICAL + horizon.hosts.WARNING + horizon.hosts.NOT_CONFIGURED + horizon.hosts.NOT_ALERTING : 0
              let hostAlerts = horizon && horizon.hosts.HEALTH_SCORE !== "N/A" ? 1 : 0
              let hostsScore = horizon && horizon.hosts.HEALTH_SCORE !== "N/A" ? horizon.hosts.HEALTH_SCORE: 0

              let browserCount = horizon ? horizon.browser.CRITICAL + horizon.browser.WARNING + horizon.browser.NOT_CONFIGURED + horizon.browser.NOT_ALERTING : 0
              let browserAlerts = horizon && horizon.browser.HEALTH_SCORE !== "N/A" ? 1 : 0
              let browserScore = horizon && horizon.browser.HEALTH_SCORE !== "N/A" ? horizon.browser.HEALTH_SCORE : 0

              let mobileCount = horizon ? horizon.mobile.CRITICAL + horizon.mobile.WARNING + horizon.mobile.NOT_CONFIGURED + horizon.mobile.NOT_ALERTING : 0
              let mobileAlerts = horizon && horizon.mobile.HEALTH_SCORE !== "N/A" ? 1 : 0
              let mobileScore = horizon && horizon.mobile.HEALTH_SCORE !== "N/A" ? horizon.mobile.HEALTH_SCORE : 0

              let synCount = horizon ? horizon.synthetics.CRITICAL + horizon.synthetics.WARNING + horizon.synthetics.NOT_CONFIGURED + horizon.synthetics.NOT_ALERTING : 0
              let synAlerts = horizon && horizon.synthetics.HEALTH_SCORE !== "N/A" ? 1 : 0
              let synScore = horizon && horizon.synthetics.HEALTH_SCORE !== "N/A" ? horizon.synthetics.HEALTH_SCORE : 0

              let divideBy = appAlerts + hostAlerts + browserAlerts + mobileAlerts + synAlerts;
              let accountScore = horizon ? (appsScore + hostsScore + browserScore + mobileScore + synScore)/divideBy : 0

              return (
                <Card key={i} style={{marginBottom:"1px", width:"300px"}} color={this.setColor(accountScore, 1)}>
                  <Card.Content>
                  {
                    retrievedDashboards.length > 0 ? this.renderCardHeader(account)
                    :
                    <Popup
                      hoverable
                      position='top center'
                      trigger={<Header as='h4'>{account.name}</Header>}
                      content={<Button onClick={() => this.setState({addDashboard: true, selectedAcct: account.id})} color='blue' size='small' icon='add'/>}
                      on='hover'
                    />
                  }
                  </Card.Content>
                  <Card.Content textAlign="center">
                      {this.renderProductModal("APPS", "code", appsScore, appsCount, appAlerts, "applications", account.id, account.name)}
                      {this.renderProductModal("INFRA", "server", hostsScore, hostsCount, hostAlerts, "hosts", account.id, account.name)}<br/><br/>
                      {this.renderProductModal("MOBILE", "mobile", mobileScore, mobileCount, mobileAlerts, "mobile", account.id, account.name)}
                      {this.renderProductModal("BROWSER", "globe", browserScore, browserCount, browserAlerts, "browser", account.id, account.name)}<br/><br/>
                      {this.renderProductModal("SYNTHETICS", "rocket", synScore, synCount, synAlerts, "synthetics", account.id, account.name)}
                  </Card.Content>

                  <Card.Content textAlign="center">
                      <span>
                          <Statistic horizontal size="mini">
                            <Statistic.Value>{isNaN(accountScore) ? "---" : (accountScore * 100).toFixed(2) + " %"}</Statistic.Value>
                            <br />
                            <Statistic.Label>HEALTHY</Statistic.Label> &nbsp;
                            <Tooltip
                              text="Healthy = sum of product scores / number of products with alerts configured"
                              placementType={Tooltip.PLACEMENT_TYPE.BOTTOM}
                            >
                            <Icon size="large" name="help circle" />
                            </Tooltip>
                          </Statistic>
                      </span>
                  </Card.Content>
                </Card>
              )
            }) : accounts.filter(account => {
              if (filteredIds){
                return filteredIds.includes(account.id)
              } else {
                return account
              }
            }).map((account, i) => {
              let horizon = this.state.accountData[account.id]
              let loadingHorizon = <Loader active={horizon && horizon.complete ? false : true } inline size="mini"/>

              let appsCount = horizon ? horizon.applications.CRITICAL + horizon.applications.WARNING + horizon.applications.NOT_CONFIGURED + horizon.applications.NOT_ALERTING : 0
              let appAlerts = horizon && horizon.applications.HEALTH_SCORE !== "N/A" ? 1 : 0
              let appsScore =  horizon && horizon.applications.HEALTH_SCORE !== "N/A" ? horizon.applications.HEALTH_SCORE : 0

              let hostsCount = horizon ? horizon.hosts.CRITICAL + horizon.hosts.WARNING + horizon.hosts.NOT_CONFIGURED + horizon.hosts.NOT_ALERTING : 0
              let hostAlerts = horizon && horizon.hosts.HEALTH_SCORE !== "N/A" ? 1 : 0
              let hostsScore = horizon && horizon.hosts.HEALTH_SCORE !== "N/A" ? horizon.hosts.HEALTH_SCORE: 0

              let browserCount = horizon ? horizon.browser.CRITICAL + horizon.browser.WARNING + horizon.browser.NOT_CONFIGURED + horizon.browser.NOT_ALERTING : 0
              let browserAlerts = horizon && horizon.browser.HEALTH_SCORE !== "N/A" ? 1 : 0
              let browserScore = horizon && horizon.browser.HEALTH_SCORE !== "N/A" ? horizon.browser.HEALTH_SCORE : 0

              let mobileCount = horizon ? horizon.mobile.CRITICAL + horizon.mobile.WARNING + horizon.mobile.NOT_CONFIGURED + horizon.mobile.NOT_ALERTING : 0
              let mobileAlerts = horizon && horizon.mobile.HEALTH_SCORE !== "N/A" ? 1 : 0
              let mobileScore = horizon && horizon.mobile.HEALTH_SCORE !== "N/A" ? horizon.mobile.HEALTH_SCORE : 0

              let synCount = horizon ? horizon.synthetics.CRITICAL + horizon.synthetics.WARNING + horizon.synthetics.NOT_CONFIGURED + horizon.synthetics.NOT_ALERTING : 0
              let synAlerts = horizon && horizon.synthetics.HEALTH_SCORE !== "N/A" ? 1 : 0
              let synScore = horizon && horizon.synthetics.HEALTH_SCORE !== "N/A" ? horizon.synthetics.HEALTH_SCORE : 0

              let divideBy = appAlerts + hostAlerts + browserAlerts + mobileAlerts + synAlerts;
              let accountScore = horizon ? (appsScore + hostsScore + browserScore + mobileScore + synScore)/divideBy : 0

              return (
                <Card key={i} style={{marginBottom:"1px", width:"300px"}} color={this.setColor(accountScore, 1)}>
                  <Card.Content>
                  {
                    retrievedDashboards.length > 0 ? this.renderCardHeader(account)
                    :
                    <Popup
                      hoverable
                      position='top center'
                      trigger={<Header as='h4'>{account.name}</Header>}
                      content={<Button onClick={() => this.setState({addDashboard: true, selectedAcct: account.id})} color='blue' size='small' icon='add'/>}
                      on='hover'
                    />
                  }
                  </Card.Content>
                  <Card.Content textAlign="center">
                  {this.renderProductModal("APPS", "code", appsScore, appsCount, appAlerts, "applications", account.id, account.name)}
                  {this.renderProductModal("INFRA", "server", hostsScore, hostsCount, hostAlerts, "hosts", account.id, account.name)}<br/><br/>
                  {this.renderProductModal("MOBILE", "mobile", mobileScore, mobileCount, mobileAlerts, "mobile", account.id, account.name)}
                  {this.renderProductModal("BROWSER", "globe", browserScore, browserCount, browserAlerts, "browser", account.id, account.name)}<br/><br/>
                  {this.renderProductModal("SYNTHETICS", "rocket", synScore, synCount, synAlerts, "synthetics", account.id, account.name)}
                  </Card.Content>

                  <Card.Content textAlign="center">
                      <span>
                          <Statistic horizontal size="mini">
                            <Statistic.Value>{isNaN(accountScore) ? "---" : (accountScore * 100).toFixed(2) + " %"}</Statistic.Value>
                            <br />
                            <Statistic.Label>HEALTHY</Statistic.Label> &nbsp;
                            <Tooltip
                              text="Healthy = sum of product scores / number of products with alerts configured"
                              placementType={Tooltip.PLACEMENT_TYPE.BOTTOM}
                            >
                            <Icon size="large" name="help circle" />
                            </Tooltip>
                          </Statistic>
                      </span>
                  </Card.Content>
                </Card>
              )
            })}
          </Card.Group>
        </div>
      )
    }

    setColor(score, count){
        if(count > 0){
            if(score >= 0.85){
                return 'green'
            }else if(score >= 0.7 && score < 0.85){
                return 'olive'
            }else if(score >= 0.65 && score < 0.7){
                return 'orange'
            }else if(score < 0.65){
                return 'red'
            }
        }
        return 'grey'
    }

    handleClick = () => this.setState(prevState => ({ useStrict: !prevState.useStrict }))

    handleSort(clickedColumn, item, type, accountId){
        const { direction } = this.state
        let accountDataNew = this.state.accountData
        accountDataNew[accountId][type][item] = _.orderBy(accountDataNew[accountId][type][item], [clickedColumn == "name" ? clickedColumn : function(e) { return e.summary[clickedColumn].value } ], [ direction === 'ascending' ? 'asc' : 'desc', direction === 'ascending' ? 'desc' : 'asc'])
        this.setState({
            column: clickedColumn,
            accountData: accountDataNew,
            direction: direction === 'ascending' ? 'descending' : 'ascending'
        })
    }

    calcTotalScore() {
        let healthScore = 0
        let healthScoreTotal = 0
        let numAccounts = 0
        let appCount = 0
        let hostCount = 0
        let browserCount = 0
        let mobileCount = 0
        let synCount = 0

        if(this.state.accountData){
            Object.keys(this.state.accountData).forEach((account)=>{
                if(this.state.accountData[account].HEALTH_SCORE !== "---"){
                    numAccounts++
                    healthScoreTotal += this.state.accountData[account].HEALTH_SCORE
                }
                appCount += this.state.accountData[account].applications.CRITICAL + this.state.accountData[account].applications.WARNING + this.state.accountData[account].applications.NOT_CONFIGURED + this.state.accountData[account].applications.NOT_ALERTING
                browserCount += this.state.accountData[account].browser.CRITICAL + this.state.accountData[account].browser.WARNING + this.state.accountData[account].browser.NOT_CONFIGURED + this.state.accountData[account].browser.NOT_ALERTING
                mobileCount += this.state.accountData[account].mobile.CRITICAL + this.state.accountData[account].mobile.WARNING + this.state.accountData[account].mobile.NOT_CONFIGURED + this.state.accountData[account].mobile.NOT_ALERTING
                hostCount += this.state.accountData[account].hosts.CRITICAL + this.state.accountData[account].hosts.WARNING + this.state.accountData[account].hosts.NOT_CONFIGURED + this.state.accountData[account].hosts.NOT_ALERTING
                synCount += this.state.accountData[account].synthetics.CRITICAL + this.state.accountData[account].synthetics.WARNING + this.state.accountData[account].synthetics.NOT_CONFIGURED + this.state.accountData[account].synthetics.NOT_ALERTING
            })
        }
        healthScore = healthScoreTotal / numAccounts
        // let dropDownModel = this.constructTagModel();
        // console.log(dropDownModel);

        return <div>
                <Statistic horizontal style={{marginBottom:"0px"}}>
                    <Tooltip
                      text="Overall Score = sum(accountScores) / # accounts with alerts configured"
                      placementType={Tooltip.PLACEMENT_TYPE.BOTTOM}
                    >
                    <Icon size="large" name="help circle" />
                    </Tooltip>
                    <Statistic.Label>Overall Score &nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{isNaN(healthScore) ? "---" : (healthScore * 100).toFixed(2) + " %"}</Statistic.Value>
                </Statistic>

                <Statistic horizontal style={{float:"right", marginBottom:"0px"}}>
                    <Statistic.Value>{appCount}</Statistic.Value>
                    <Statistic.Label>Apps &nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{hostCount}</Statistic.Value>
                    <Statistic.Label>Hosts &nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{browserCount}</Statistic.Value>
                    <Statistic.Label>Browser &nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{mobileCount}</Statistic.Value>
                    <Statistic.Label>Mobile &nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{synCount}</Statistic.Value>
                    <Statistic.Label>Scripts &nbsp;&nbsp;</Statistic.Label>
                </Statistic>
            </div>
    }

    render() {
      let { accounts, retrievedTags, tagsLoaded } = this.state;

      return (
          <div style={{paddingTop:"5px",paddingLeft:"5px"}}>
            {tagsLoaded ? <Tags loadedAccounts={accounts} loadedTags={retrievedTags} onTagRefresh={this.handleTagRefresh} /> : <Spinner />}
            {tagsLoaded ? <TagDropdown loadedTags={retrievedTags} filterChange={(e, d) => this.handleFilterChange(e, d)}/> : <Spinner />}
            <Segment style={{marginBottom:"10px"}}> {this.calcTotalScore()} </Segment>
            {this.renderAccountCards()}
            {this.renderDashboardModal()}
          </div>
      )
    }
}
