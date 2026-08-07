package app.bitquest.wrapper;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Home-screen widget: shows the current streak and gem count and taps straight
 * into a lesson. Numbers are pushed from the web app through the JS bridge and
 * cached in SharedPreferences so the widget can render without the app open.
 */
public class StreakWidget extends AppWidgetProvider {

    private static final String PREFS = "bitquest_widget";
    private static final String KEY_STREAK = "streak";
    private static final String KEY_GEMS = "gems";

    static void saveStats(Context context, int streak, int gems) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putInt(KEY_STREAK, streak).putInt(KEY_GEMS, gems).apply();
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
        views.setTextViewText(R.id.widget_streak_value, prefs.getInt(KEY_STREAK, 0) + " day streak");
        views.setTextViewText(R.id.widget_gems_value, prefs.getInt(KEY_GEMS, 0) + " gems");

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
