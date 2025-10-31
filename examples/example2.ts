import { randomInt } from "node:crypto";
import { LLRPClient, LLRPCore, LLRPCoreDataTypes } from "../src";

const rOSpec = new LLRPCore.ROSpec({
  data: {
    ROSpecID: 1,
    Priority: 0,
    CurrentState: 'Disabled',
    ROBoundarySpec: {
      ROSpecStartTrigger: {
        ROSpecStartTriggerType: 'Immediate'
      },
      ROSpecStopTrigger: {
        ROSpecStopTriggerType: "Null",
        DurationTriggerValue: 0
      }
    },
    AISpec: [
      {
        AntennaIDs: [1, 2],
        AISpecStopTrigger: {
          AISpecStopTriggerType: 'Null',
          DurationTrigger: 0
        },
        InventoryParameterSpec: {
          InventoryParameterSpecID: 1,
          ProtocolID: 'EPCGlobalClass1Gen2',
          AntennaConfiguration: [
            {
              AntennaID: 1,
              RFTransmitter: {
                HopTableID: 1,
                ChannelIndex: 1,
                TransmitPower: 10
              },
              C1G2InventoryCommand: {
                TagInventoryStateAware: false,
                C1G2SingulationControl: {
                  Session: 0,
                  TagPopulation: 10,
                  TagTransitTime: 0
                }
              }  
            },
            {
              AntennaID: 2,
              RFTransmitter: {
                HopTableID: 1,
                ChannelIndex: 1,
                TransmitPower: 10
              },
              C1G2InventoryCommand: {
                TagInventoryStateAware: false,
                C1G2SingulationControl: {
                  Session: 0,
                  TagPopulation: 10,
                  TagTransitTime: 0
                }
              }  
            }
          ]
        }
      }
    ],
    ROReportSpec: {
      ROReportTrigger: 'Upon_N_Tags_Or_End_Of_ROSpec',
      N: 1,
      TagReportContentSelector: {
        EnableROSpecID: false,
        EnableSpecIndex: false,
        EnableInventoryParameterSpecID: false,
        EnableAntennaID: true,
        EnableChannelIndex: true,
        EnablePeakRSSI: false,
        EnableFirstSeenTimestamp: false,
        EnableLastSeenTimestamp: false,
        EnableTagSeenCount: true,
        EnableAccessSpecID: false
      }
    }
  }
})

const reader = new LLRPClient({
  host: '10.10.0.195'
})
const checkConnectionStatus = async () => {
    let msg = await reader.recv(7000) as any
    if (!(msg instanceof LLRPCore.READER_EVENT_NOTIFICATION)) {
        throw new Error(`connection status check failed - unexpected message ${msg.getName()}`);
    }
    const status = msg.getReaderEventNotificationData().getConnectionAttemptEvent()?.getStatus();
    if (status != "Success") {
        throw new Error(`connection status check failed ${status}`);
    }
    return;
}

async function main() {
  try {
    reader.on('disconnect', () => {
      console.log('Disconnected from reader')
    })

    reader.on('message', async (msg) => {
      const data  = msg.toLLRPData()

      if (data.type === 'KEEPALIVE') {
        //reader.send(new LLRPCore.KEEPALIVE_ACK({
        //  id: msg.getMessageId(),
        //  data: {}
        //}))

        const random = Math.random() > 0.5

        console.log(`Setting GPO2 to ${random}`)

        await reader.send(new LLRPCore.SET_READER_CONFIG({
          data: {
            ResetToFactoryDefault: false,
            GPOWriteData: {
              GPOPortNumber: 2,
              GPOData: random
            },
          }
        }))
      }

      console.log(JSON.stringify(data))
    })

    reader.on('error', (err) => {
      console.error('Error:', err)
    })

    await reader.connect()

    await checkConnectionStatus()

    await reader.transact(new LLRPCore.DELETE_ROSPEC({
      data: { ROSpecID: 0 }
    }))

    await reader.transact(new LLRPCore.SET_READER_CONFIG({
      data: { 
        ResetToFactoryDefault: true,
        ReaderEventNotificationSpec: {
          EventNotificationState: [
            {
              EventType: 'GPI_Event',
              NotificationState: true
            }
          ]
        },
        KeepaliveSpec: {
          KeepaliveTriggerType: 'Periodic',
          PeriodicTriggerValue: 3000
        },
        GPOWriteData: {
          GPOPortNumber: 1,
          GPOData: 1
        },
      }
    }))

    await reader.transact(new LLRPCore.ADD_ROSPEC().setROSpec(rOSpec))

    await reader.transact(new LLRPCore.ENABLE_ROSPEC({
      data: { ROSpecID: 1 }
    }))

    await reader.transact(new LLRPCore.START_ROSPEC({
      data: { ROSpecID: 1 }
    }))
  } catch (error) {
    console.log(error)
  }
}

main()
