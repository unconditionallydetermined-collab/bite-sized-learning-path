package app.bitquest.wrapper;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.util.Random;

/**
 * Home-screen widget: monochrome, quietly hypnotic.
 *
 * Pure black with white linework only. A slow breathing ring sits behind a
 * rotating cast of abstract line-art characters, and the streak dot flickers.
 * Every render re-rolls the character, the breath tempo and the caption, so the
 * widget never looks quite the same twice. The character's mood shifts from
 * "idle" to "waiting" the longer it has been since the last session — a nudge
 * to come back, kept understated and entirely within black and white.
 */
public class StreakWidget extends AppWidgetProvider {

    private static final String PREFS = "bitquest_widget";
    private static final String KEY_STREAK = "streak";
    private static final String KEY_GEMS = "gems";
    private static final String KEY_LAST_SEEN = "last_seen";

    private static final int[] MASCOTS_IDLE = {
            R.drawable.mascot_1_idle, R.drawable.mascot_2_idle,
            R.drawable.mascot_3_idle, R.drawable.mascot_4_idle,
    };
    private static final int[] MASCOTS_WAITING = {
            R.drawable.mascot_1_waiting, R.drawable.mascot_2_waiting,
            R.drawable.mascot_3_waiting, R.drawable.mascot_4_waiting,
    };

    /** Understated captions. Fresh session vs. gone-a-while sets. */
    private static final String[] MOOD_FRESH = {
            "tap in", "still warm", "one more bit", "keep it lit",
    };
    private static final String[] MOOD_WAITING = {
            "waiting up", "the flame dips", "it misses you", "still here",
    };

    private static final Random RANDOM = new Random();

    static void saveStats(Context context, int streak, int gems) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .putInt(KEY_STREAK, streak)
                .putInt(KEY_GEMS, gems)
                .putLong(KEY_LAST_SEEN, System.currentTimeMillis())
                .apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widget = new ComponentName(context, StreakWidget.class);
        int[] ids = manager.getAppWidgetIds(widget);
        for (int id : ids) {
            render(context, manager, id);
        }
    }

    private static void render(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak);

        int streak = prefs.getInt(KEY_STREAK, 0);
        views.setTextViewText(R.id.widget_streak_value, streak + " day streak");
        views.setTextViewText(R.id.widget_gems_value, prefs.getInt(KEY_GEMS, 0) + " gems");

        long lastSeen = prefs.getLong(KEY_LAST_SEEN, 0L);
        long hoursAway = lastSeen == 0L
                ? 24L
                : (System.currentTimeMillis() - lastSeen) / (60L * 60L * 1000L);
        boolean waiting = hoursAway >= 8L;

        int[] cast = waiting ? MASCOTS_WAITING : MASCOTS_IDLE;
        views.setImageViewResource(R.id.widget_mascot, cast[RANDOM.nextInt(cast.length)]);
        // Breath quickens when the learner has been away — a small restlessness.
        views.setImageViewResource(R.id.widget_pulse,
                waiting ? R.drawable.breathe_fast : R.drawable.breathe_slow);

        String[] moods = waiting ? MOOD_WAITING : MOOD_FRESH;
        views.setTextViewText(R.id.widget_mood, moods[RANDOM.nextInt(moods.length)]);

        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra(MainActivity.EXTRA_QUICK_LESSON, true);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                context, widgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        manager.updateAppWidget(widgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int widgetId : widgetIds) {
            render(context, manager, widgetId);
        }
    }
}
