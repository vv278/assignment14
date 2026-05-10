import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "jsearch.p.rapidapi.com";

function buildJSearchQuery({ query, location }) {
  const q = (query ?? "").toString().trim();
  const loc = (location ?? "").toString().trim();

  if (!q && !loc) return "";

  if (q && !loc) return q;

  if (!q && loc) return `jobs in ${loc}`;

  return `${q} jobs in ${loc}`;
}

app.get("/jobs", async (req, res) => {
  try {
    if (!RAPIDAPI_KEY) {
      return res.status(500).json({
        error: "Missing RAPIDAPI_KEY on server",
      });
    }

    const {
      query,
      location,
      page = "1",
      num_pages = "1",
      country = "us",
      date_posted = "all",
    } = req.query;

    const builtQuery = buildJSearchQuery({
      query,
      location,
    });

    if (!builtQuery) {
      return res.status(400).json({
        error: "Please provide query and/or location",
      });
    }

    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/search`,
      {
        params: {
          query: builtQuery,
          page,
          num_pages,
          country,
          date_posted,
        },

        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      }
    );

    const rawJobs = response?.data?.data ?? [];

    const jobs = rawJobs.map((j) => ({
      id:
        j.job_id ??
        j.job_apply_link ??
        `${j.employer_name ?? ""}-${j.job_title ?? ""}`,

      title: j.job_title ?? "",

      company: j.employer_name ?? "",

      location:
        j.job_city || j.job_state || j.job_country
          ? [
              j.job_city,
              j.job_state,
              j.job_country,
            ]
              .filter(Boolean)
              .join(", ")
          : j.job_location ?? "",

      employmentType:
        j.job_employment_type ?? "",

      postedAt:
        j.job_posted_at_datetime_utc ?? "",

      description:
        j.job_description ?? "",

      applyLink:
        j.job_apply_link ??
        j.job_google_link ??
        "",

      source:
        j.job_publisher ?? "",
    }));

    res.json({
      query: {
        query: builtQuery,
        page: Number(page),
        num_pages: Number(num_pages),
        country,
        date_posted,
      },

      jobs,

      raw: response.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status =
        error.response?.status ?? 500;

      const message =
        (
          error.response?.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
            ? error.response.data.message
            : undefined
        ) ?? error.message;

      console.error(
        "JSearch request failed:",
        status,
        message
      );

      return res.status(status).json({
        error: "Failed to fetch jobs",

        upstream: {
          status,
          message,
        },
      });
    }

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch jobs",
    });
  }
});

// Starter assignment (students implement):
// Create a POST endpoint like `/cover-letter`
// that accepts resume + job details,
// calls a cover-letter generation API,
// and returns the generated text.

app.post("/cover-letter", async (_req, res) => {
  res.status(501).json({
    error: "Not implemented",

    message:
      "Students: implement POST /cover-letter in Backend/server.js to call a cover-letter API and return the generated text.",
  });
});

app.listen(5000, () =>
  console.log("Server running on port 5000")
);