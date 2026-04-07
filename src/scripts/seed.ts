import { createClient } from '@supabase/supabase-js'

type DriverRow = {
  slug: string | null
  driver_id?: string | null
  ergast_driver_id?: string | null
}

type JolpicaResponse = {
  MRData?: {
    RaceTable?: {
      Races?: Array<{
        Results?: Array<{
          position?: string
        }>
      }>
    }
  }
}

function getDriverId(driver: DriverRow): string | null {
  if (driver.ergast_driver_id) return driver.ergast_driver_id
  if (driver.driver_id) return driver.driver_id
  if (driver.slug) return driver.slug
  return null
}

async function getCareerStats(driverId: string) {
  const url = `https://api.jolpi.ca/ergast/f1/drivers/${driverId}/results/`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Jolpica request failed for ${driverId} (${response.status})`)
  }

  const data = (await response.json()) as JolpicaResponse
  const races = data.MRData?.RaceTable?.Races ?? []
  const raceResults = races.flatMap((race) => race.Results ?? [])

  const careerStarts = raceResults.length
  const careerWins = raceResults.filter((result) => result.position === '1').length
  const careerPodiums = raceResults.filter((result) => {
    const position = Number.parseInt(result.position ?? '', 10)
    return Number.isFinite(position) && position <= 3
  }).length

  return {
    career_wins: careerWins,
    career_podiums: careerPodiums,
    career_starts: careerStarts,
  }
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: drivers, error } = await supabase.from('drivers').select('*')

  if (error) {
    throw new Error(`Failed to fetch drivers: ${error.message}`)
  }

  for (const driver of (drivers ?? []) as DriverRow[]) {
    if (!driver.slug) {
      continue
    }

    const driverId = getDriverId(driver)
    if (!driverId) {
      continue
    }

    try {
      const stats = await getCareerStats(driverId)

      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          career_wins: stats.career_wins,
          career_podiums: stats.career_podiums,
          career_starts: stats.career_starts,
        })
        .eq('slug', driver.slug)

      if (updateError) {
        console.error(`Failed to update ${driver.slug}: ${updateError.message}`)
        continue
      }

      console.log(
        `Updated ${driver.slug}: wins=${stats.career_wins}, podiums=${stats.career_podiums}, starts=${stats.career_starts}`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`Failed to sync ${driver.slug}: ${message}`)
    }
  }
}

void run()
