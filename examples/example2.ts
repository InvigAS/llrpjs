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
        AntennaIDs: [1, 2, 3, 4, 5, 6],
        AISpecStopTrigger: {
          AISpecStopTriggerType: 'Null',
          DurationTrigger: 0
        },
        InventoryParameterSpec: {
          InventoryParameterSpecID: 1,
          ProtocolID: 'EPCGlobalClass1Gen2',
          AntennaConfiguration: {
            AntennaID: 0,
            RFTransmitter: {
              HopTableID: 1,
              ChannelIndex: 1,
              TransmitPower: 1
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
    let msg = await reader.recv(7000);
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
  reader.on('message', async (msg) => {
    const data  = msg.toLLRPData()

    console.log(data)
  })

  reader.on('error', (err) => {
    console.error('Error:', err)
  })

  await reader.connect()
  
  await checkConnectionStatus()

  await reader.transact(new LLRPCore.DELETE_ROSPEC({
    data: { ROSpecID: 0 }
  }))

  await reader.transact(new LLRPCore.ADD_ROSPEC().setROSpec(rOSpec))

  await reader.transact(new LLRPCore.ENABLE_ROSPEC({
    data: { ROSpecID: 1 }
  }))

  await reader.transact(new LLRPCore.START_ROSPEC({
    data: { ROSpecID: 1 }
  }))
}

main()
