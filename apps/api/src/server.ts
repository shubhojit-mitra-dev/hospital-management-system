import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import hospitalRouter from './routes/hospital.routes.js';
import patientRouter from './routes/patient.routes.js';
import doctorRouter from './routes/doctor.routes.js';
import staffRouter from './routes/staff.routes.js';
import appointmentRouter from './routes/appointment.routes.js';

export const app: Express = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Mount Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin/users', adminRouter);
app.use('/api/v1/hospitals', hospitalRouter);
app.use('/api/v1/patients', patientRouter);
app.use('/api/v1/doctors', doctorRouter);
app.use('/api/v1/staff', staffRouter);
app.use('/api/v1/appointments', appointmentRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = env.PORT || 4000;

if (env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
