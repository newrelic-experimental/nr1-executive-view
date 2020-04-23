module.exports = {
    getAccounts: () =>{
      return `{
        actor {
          accounts {
            id
            name
          }
        }
      }`
    },
    // type = APPLICATION
    agentList: (accountId, type) => {
      return `
      {
        actor {
          entitySearch(query: "domain='${type}' and reporting='true' and accountId=${accountId}") {
            results {
              entities {
                ... on ApmApplicationEntityOutline {
                  alertSeverity
                  accountId
                  apmSummary {
                    errorRate
                    throughput
                    responseTimeAverage
                  }
                  language
                  guid
                }
                name
                type
              }
            }
          }
        }
      }`
    },

    browseragentList: (accountId, type) => {
      return `
      {
        actor {
          entitySearch(query: "domain='${type}' and reporting='true' and accountId=${accountId}") {
            results {
              entities {
                type
                name
                ... on BrowserApplicationEntityOutline {
                  guid
                  accountId
                  alertSeverity
                  reporting
                  browserSummary {
                    pageLoadThroughput
                    pageLoadTimeAverage
                    jsErrorRate
                  }
                  name
                  type
                }
              }
            }
          }
        }
      }
`
    },

    mobileagentList: (accountId, type) => {
      return `
      {
        actor {
          entitySearch(query: "domain='${type}' and reporting='true' and accountId=${accountId}") {
            results {
              entities {
                type
                name
                ... on MobileApplicationEntityOutline {
                  guid
                  name
                  accountId
                  mobileSummary {
                    crashRate
                    httpResponseTimeAverage
                  }
                  alertSeverity
                }
              }
            }
          }
        }
      }`
    },

    hostagentList: (accountId, type) => {
      return `
      {
        actor {
          entitySearch(query: "domain='${type}' and type='HOST' and reporting='true' and accountId=${accountId}") {
            results {
              entities {
                type
                name
                ... on InfrastructureHostEntityOutline {
                  guid
                  name
                  accountId
                  alertSeverity
                  hostSummary {
                    cpuUtilizationPercent
                    diskUsedPercent
                    memoryUsedPercent
                  }
                }
              }
            }
          }
        }
      }
`
    },

    synagentList: (accountId, type) => {
      return `
      {
        actor {
          entitySearch(query: "domain='${type}' and reporting='true' and accountId=${accountId}") {
            results {
              entities {
                name
                type
                ... on SyntheticMonitorEntityOutline {
                  guid
                  name
                  accountId
                  alertSeverity
                  monitorSummary {
                    successRate
                  }
                }
              }
            }
          }
        }
      }
    `
  },

    dashboards: (accountId) => {
      return `{
        actor {
          entitySearch(query: "accountId=${accountId} and type='DASHBOARD'") {
            results {
              entities {
                accountId
                guid
                name
                type
              }
            }
          }
        }
      }`
    }
  };
